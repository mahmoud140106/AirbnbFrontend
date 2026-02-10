import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  takeUntil,
  catchError,
  of,
  forkJoin,
  combineLatest,
  map,
  timeout,
} from 'rxjs';

import { PropertyDisplayDTO, PropertyService } from './../../core/services/Property/property.service';
import { PropertyImageService } from './../../core/services/PropertyImage/property-image.service';
import { UserService } from './../../core/services/Admin/user-service';
import { ReviewService } from '../../core/services/Review/review.service';
import { HostReviewDTO } from '../../core/models/ReviewInterfaces/host-review-dto';
import { IGuestReviewDto } from '../../core/models/ReviewInterfaces/guest-review-dto';
import { environment } from '../../../environments/environment.development';
import { ProfileCard } from '../../shared/components/profile-card/profile-card';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [DecimalPipe, CommonModule, ProfileCard],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfile implements OnInit, OnDestroy, OnChanges {
  userId: string = '';
  isHost: boolean = false;
  loading: boolean = false;
  error: string | null = null;

  userProfile: any = null;
  hostReviews: any[] = [];
  guestReviews: any[] = [];

  hostPropertiesList: any[] = [];
  uniqueVisitedProperties: any[] = [];
  propertiesWithReviewsList: any[] = [];

  hostStats: any = null;
  guestStats: any = null;

  showHostReviewsModal: boolean = false;
  showHostPropertiesModal: boolean = false;
  showGuestReviewsModal: boolean = false;

  profileLoading: boolean = true;
  reviewsLoading: boolean = true;
  propertiesLoading: boolean = true;
  imagesLoading: boolean = false;
  statsCalculated: boolean = false;

  public imageBaseUrl = environment.baseUrl.replace('/api', '');
  imageErrors: Set<any> = new Set();

  private destroy$ = new Subject<void>();

  @ViewChild('reviewsContainer', { static: false }) reviewsContainer!: ElementRef;
  @ViewChild('listingsContainer', { static: false }) listingsContainer!: ElementRef;

  private currentScrollPosition = 0;
  private listingsScrollPosition = 0;
  private readonly scrollStep = 306;
  private readonly listingsScrollStep = 266;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reviewService: ReviewService,
    private userService: UserService,
    private propertyService: PropertyService,
    private propertyImageService: PropertyImageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['id'];
    if (!this.userId) {
      this.error = 'User ID is required';
      this.cdr.markForCheck();
      return;
    }
    this.loadAllDataParallel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.retryLoadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllDataParallel(): void {
    const startTime = performance.now();

    combineLatest([
      this.userService.getUserProfile(this.userId).pipe(catchError(() => of(null))),
      this.reviewService.isUserHost(this.userId).pipe(catchError(() => of(false))),
      this.reviewService.getHostReviewsWithProperties(this.userId).pipe(catchError(() => of([]))),
      this.reviewService.getPublicReviewsByUserId(this.userId).pipe(catchError(() => of([]))),
      this.propertyService.getPropertiesByHostId(this.userId).pipe(catchError(() => of([])))
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([profile, isHost, hostReviews, guestReviews, properties]) => {
        this.userProfile = profile;
        this.isHost = isHost;

        // Pre-calculate stars for reviews
        this.hostReviews = (hostReviews || []).map(r => ({
          ...r,
          starArray: Array(Math.floor(Math.min(r.rating || 0, 5))).fill(0),
          emptyStarArray: Array(Math.floor(Math.min(5 - (r.rating || 0), 5))).fill(0)
        }));

        this.guestReviews = (guestReviews || []).map(r => ({
          ...r,
          starArray: Array(Math.floor(Math.min(r.rating || 0, 5))).fill(0),
          emptyStarArray: Array(Math.floor(Math.min(5 - (r.rating || 0), 5))).fill(0)
        }));

        this.hostPropertiesList = (properties || []).map(p => ({
          ...p,
          displayImage: 'assets/images/deafult.png'
        }));

        this.profileLoading = false;
        this.reviewsLoading = false;
        this.propertiesLoading = false;

        this.calculateAllStats();
        this.updateUniqueVisitedProperties();
        this.updatePropertiesWithReviews();

        this.cdr.markForCheck();
        this.loadPropertyImagesInBackground(properties || []);
      });
  }

  private calculateAllStats(): void {
    if (this.isHost) {
      const totalReviews = this.hostReviews.length;
      if (totalReviews > 0) {
        const totalRating = this.hostReviews.reduce((sum, r) => sum + r.rating, 0);
        const oldestReview = this.hostReviews.reduce((oldest, r) =>
          new Date(r.createdAt) < new Date(oldest.createdAt) ? r : oldest
        );
        this.hostStats = {
          totalReviews,
          averageRating: totalRating / totalReviews,
          monthsHosting: Math.ceil((Date.now() - new Date(oldestReview.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)),
          totalProperties: this.hostPropertiesList.length
        };
      }
    } else {
      const totalReviews = this.guestReviews.length;
      if (totalReviews > 0) {
        const oldestReview = this.guestReviews.reduce((oldest, r) =>
          new Date(r.createdAt) < new Date(oldest.createdAt) ? r : oldest
        );
        this.guestStats = {
          totalTrips: this.uniqueVisitedProperties.length,
          totalReviews,
          yearsOnPlatform: Math.ceil((Date.now() - new Date(oldestReview.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365))
        };
      }
    }
    this.statsCalculated = true;
  }

  private updateUniqueVisitedProperties(): void {
    const propertyMap = new Map();
    this.guestReviews.forEach(r => {
      if (!propertyMap.has(r.propertyId)) {
        propertyMap.set(r.propertyId, { id: r.propertyId });
      }
    });
    this.uniqueVisitedProperties = Array.from(propertyMap.values());
  }

  private updatePropertiesWithReviews(): void {
    const propertyMap = new Map();
    this.hostReviews.forEach(r => {
      if (r.property?.id && !propertyMap.has(r.property.id)) {
        propertyMap.set(r.property.id, r.property);
      }
    });
    this.propertiesWithReviewsList = Array.from(propertyMap.values());
  }

  private loadPropertyImagesInBackground(properties: any[]): void {
    if (!properties.length) return;
    this.imagesLoading = true;

    const imageRequests = properties.map(p =>
      this.propertyImageService.getAllImagesByPropertyId(p.id).pipe(
        map(res => ({ id: p.id, images: res.isSuccess ? res.data : [] })),
        catchError(() => of({ id: p.id, images: [] })),
        timeout(5000),
        catchError(() => of({ id: p.id, images: [] }))
      )
    );

    forkJoin(imageRequests).subscribe(results => {
      const imageMap = new Map(results.map(r => [r.id, r.images]));
      this.hostPropertiesList = this.hostPropertiesList.map(p => {
        const images = imageMap.get(p.id) || [];
        return {
          ...p,
          images,
          displayImage: this.getPropertyImageInternal(images)
        };
      });
      this.imagesLoading = false;
      this.cdr.markForCheck();
    });
  }

  private getPropertyImageInternal(images: any[]): string {
    const cover = images?.find(img => img.isCover && !img.isDeleted);
    return cover?.imageUrl ? `${environment.base}${cover.imageUrl}` : 'assets/images/deafult.png';
  }

  getImageUrl(path: string | undefined): string {
    return path ? this.imageBaseUrl + path : '';
  }

  onImageError(event: any, item: any): void {
    const id = item?.id || item?.userId;
    if (id) {
      this.imageErrors.add(id);
      this.cdr.markForCheck();
    }
  }

  shouldShowImage(imageUrl: string | undefined, itemId: any): boolean {
    return !!(imageUrl && imageUrl.trim() !== '' && !this.imageErrors.has(itemId));
  }

  shouldShowFallback(imageUrl: string | undefined, itemId: any): boolean {
    return !imageUrl || imageUrl.trim() === '' || this.imageErrors.has(itemId);
  }

  getInitials(first: string, last: string): string {
    return (first?.charAt(0) || '') + (last?.charAt(0) || '');
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getBirthDecade(): string {
    if (!this.userProfile?.birthDate) return '';
    const year = new Date(this.userProfile.birthDate).getFullYear();
    return `Born in the ${Math.floor(year / 10) * 10}s`;
  }

  scrollReviews(direction: 'left' | 'right'): void {
    if (!this.reviewsContainer) return;
    const container = this.reviewsContainer.nativeElement;
    const scrollAmount = direction === 'right' ? this.scrollStep : -this.scrollStep;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  scrollListings(direction: 'left' | 'right'): void {
    if (!this.listingsContainer) return;
    const container = this.listingsContainer.nativeElement;
    const scrollAmount = direction === 'right' ? this.listingsScrollStep : -this.listingsScrollStep;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }


  navigateToProperty(id: number): void {
    this.router.navigate(['/property', id]);
  }

  retryLoadData(): void {
    this.profileLoading = true;
    this.reviewsLoading = true;
    this.propertiesLoading = true;
    this.error = null;
    this.loadAllDataParallel();
  }

  openHostReviewsModal(): void { this.showHostReviewsModal = true; }
  closeHostReviewsModal(): void { this.showHostReviewsModal = false; }
  openHostPropertiesModal(): void { this.showHostPropertiesModal = true; }
  closeHostPropertiesModal(): void { this.showHostPropertiesModal = false; }
  openGuestReviewsModal(): void { this.showGuestReviewsModal = true; }
  closeGuestReviewsModal(): void { this.showGuestReviewsModal = false; }

  isDarkMode(): boolean {
    return document.body.classList.contains('dark-mode');
  }

  truncateText(text: string, len: number): string {
    return text?.length > len ? text.substring(0, len) + '...' : text;
  }

  formatDate(date: string): string {
    return date ? new Date(date).toLocaleDateString() : '';
  }

  get isDataLoading(): boolean {
    return this.profileLoading || this.reviewsLoading || this.propertiesLoading;
  }

  get canShowProfile(): boolean { return !this.profileLoading && !!this.userProfile; }
  get canShowReviews(): boolean { return !this.reviewsLoading; }
  get hasHostReviews(): boolean { return this.hostReviews.length > 0; }
  get hasGuestReviews(): boolean { return this.guestReviews.length > 0; }
  get hasVisitedProperties(): boolean { return this.uniqueVisitedProperties.length > 0; }
}
