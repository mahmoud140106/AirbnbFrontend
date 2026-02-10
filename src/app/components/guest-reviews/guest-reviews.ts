import { PropertyService } from './../../core/services/Property/property.service';
import { PropertyDisplayWithHostDataDto } from './../../pages/add-property/models/property.model';
import { Property } from './../../core/models/Property';

import { UserBookingService } from './../../core/services/Booking/user-booking-service';
import { Confirm } from './../../shared/components/confirm/confirm';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../core/services/Review/review.service';
import { IGuestReviewDto } from './../../core/models/ReviewInterfaces/guest-review-dto';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  input,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StarComponent } from '../../shared/components/star-component/star-component';

import { AuthService } from '../../core/services/auth.service';
import { BookingDetailsDTO } from '../../core/services/Booking/user-booking-service';

import { Button } from '../../shared/components/button/button';
import { ConfirmService } from '../../core/services/confirm.service';
import { Modal } from '../../shared/components/modal/modal';
import { ReviewsModalComponent } from './guest-review-modal/guest-review-modal';
import { environment } from '../../../environments/environment.development';
import { HostReviewDTO } from '../../core/models/ReviewInterfaces/host-review-dto';
import { ProfileCard } from '../../shared/components/profile-card/profile-card';

@Component({
  selector: 'app-guest-reviews',
  standalone: true,
  imports: [
    CommonModule,
    StarComponent,
    ReviewsModalComponent,
    ProfileCard,
    RouterLink
  ],
  templateUrl: './guest-reviews.html',
  styleUrl: './guest-reviews.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestReviews implements OnInit, OnChanges {
  @Input() propertyId!: number;

  // @Input() propertyName: string = 'This Property';
  //@Input() userbookings: any[] = [];

  currentUser: any = null;

  reviews: IGuestReviewDto[] = [];
  visibleReviews: any[] = [];
  showReviewsModal: boolean = false;

  // Optimized statistics properties
  ratingDistributionData: { [key: number]: number } = {};
  categoryAveragesData: { [key: string]: number } = {};
  overallRatingValue: number = 0;

  // userExistingReview: boolean = false;

  userBookings: BookingDetailsDTO[] = [];

  currentBookingId = 0;

  showTooltip: boolean = false;

  isLoadingBookings: boolean = false;

  showReviewForm = false;

  ratingLevels: number[] = [5, 4, 3, 2, 1];
  reviewCategories: string[] = ['cleanliness', 'accuracy', 'checkIn', 'communication', 'location', 'value'];

  constructor(
    private confirmService: ConfirmService,
    private ReviewService: ReviewService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router,
    private UserBookingService: UserBookingService,
    private PropertyService: PropertyService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.userId;
    this.loadHostInfo();
    // this.loadUserCompletedBookings();

    if (this.propertyId) {
      this.loadReviewsByPropertyId();

      //for profile card
      //    this.loadHostInformation();
      //

      if (this.currentUser) {
        //this.checkUserReviewEligibility();
        this.loadUserBookings();
      }
    }

    // else {
    //   this.loadAllReviews();
    // }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propertyId'] && !changes['propertyId'].firstChange) {
      this.loadReviewsByPropertyId();
      this.loadHostInfo();
    }
  }

  public imageBaseUrl = environment.baseUrl.replace('/api', '');

  getImageUrl(profilePictureURL: string): string {
    return this.imageBaseUrl + profilePictureURL;
  }

  imageErrors: Set<any> = new Set();

  onImageError(event: any, review: IGuestReviewDto): void {
    this.imageErrors.add(review.id);
  }


  openReviewsModal(): void {
    this.showReviewsModal = true;
  }

  closeReviewsModal(): void {
    this.showReviewsModal = false;
  }

  trackByReviewId(index: number, review: IGuestReviewDto): number {
    return review.id;
  }

  loadUserBookings(): void {
    if (!this.currentUser) return;

    this.isLoadingBookings = true;
    this.UserBookingService.getBookingsByUserId(this.currentUser).subscribe({
      next: (bookings) => {
        this.userBookings = bookings;
        this.isLoadingBookings = false;
        this.updateReviewEligibility();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user bookings:', error);
        this.isLoadingBookings = false;
      },
    });
  }

  canShowReviewButton: boolean = false;

  updateReviewEligibility(): void {
    if (!this.currentUser || this.isLoadingBookings) {
      this.canShowReviewButton = false;
      return;
    }

    const hasCompletedBooking = this.userBookings.some(
      (booking) =>
        booking.propertyId === this.propertyId &&
        booking.bookingStatus === 'Completed'
    );

    if (!hasCompletedBooking) {
      this.canShowReviewButton = false;
      return;
    }

    const hasExistingReview = this.reviews.some(
      (review) => String(review.user.userId) === String(this.currentUser)
    );

    this.canShowReviewButton = !hasExistingReview;
  }

  shouldShowReviewButton(): boolean {
    return this.canShowReviewButton;
  }

  // hasExistingReview(): boolean {
  //   return this.reviews.some((review) => review.userId === this.currentUser);
  // }

  hasExistingReview(): boolean {
    return this.reviews.some((review) => String(review.user.userId) === String(this.currentUser));
  }
  getCompletedBookingForProperty(): BookingDetailsDTO | null {
    return (
      this.userBookings
        .filter(
          (booking) =>
            booking.propertyId === this.propertyId &&
            booking.bookingStatus === 'Completed'
        )
        .sort(
          (a, b) =>
            new Date(b.checkOutDate).getTime() -
            new Date(a.checkOutDate).getTime()
        )[0] || null
    );
  }

  toggleTooltip(event: Event) {
    event.preventDefault();
    this.showTooltip = !this.showTooltip;

    if (this.showTooltip) {
      setTimeout(() => {
        document.addEventListener(
          'click',
          this.closeTooltipOnOutsideClick.bind(this)
        );
      }, 0);
    }
  }

  private closeTooltipOnOutsideClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.learn-container')) {
      this.showTooltip = false;
      this.cdr.detectChanges();
      document.removeEventListener(
        'click',
        this.closeTooltipOnOutsideClick.bind(this)
      );
    }
  }
  navigateToReviewerProfile(userId: string): void {
    if (userId) {
      this.router.navigate(['/user', userId]);
    }
  }
  navigateToAddReview() {
    this.router.navigate(['/review/0'], {
      queryParams: {
        propertyId: this.propertyId,
        mode: 'add',
      },
    });
  }

  navigateToEditReview(review: IGuestReviewDto) {
    this.router.navigate(['/review', review.id], {
      state: { reviewData: review },

      queryParams: {
        mode: 'edit',
      },
    });
  }

  loadReviewsByPropertyId(): void {
    if (!this.propertyId) return;

    this.ReviewService.getReviewsByPropertyId(this.propertyId!).subscribe({
      next: (response) => {
        console.log('Raw API Response:', response);
        console.log('First review object:', response[0]);
        console.log('Keys in first review:', Object.keys(response[0] || {}));

        this.reviews = response;
        this.calculateReviewStats();
        this.updateReviewEligibility();
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Error loading reviews:', e);
      },
    });
  }

  // loadAllReviews(): void {
  //   this.ReviewService.getAllReviews().subscribe({
  //     next: (response) => {
  //       this.reviews = response;
  //       this.cdr.detectChanges();
  //     },
  //     error: (e) => {
  //       console.log(e);
  //     },
  //   });
  // }

  // performDelete(reviewId: number) {
  //   this.ReviewService.deleteReview(reviewId).subscribe({
  //     next: () => {
  //       //     this.reviews = this.reviews.filter((review) => review.id !== reviewId);
  //       // this.userExistingReview = false;
  //       // Recheck eligibility after deletion
  //       // this.checkUserReviewEligibility();
  //       this.reviews = this.reviews.filter((review) => review.id !== reviewId);

  //       this.cdr.detectChanges();

  //       //   this.cdr.detectChanges();
  //     },
  //     error: (error) => {
  //       console.error('Delete failed:', error);
  //     },
  //   });
  // }
  performDelete(reviewId: number) {
    // Optimistically update UI first
    this.reviews = this.reviews.filter((review) => review.id !== reviewId);
    this.calculateReviewStats();
    this.updateReviewEligibility();
    this.cdr.detectChanges();

    this.ReviewService.deleteReview(reviewId).subscribe({
      next: () => {
        // Already filtered above
        console.log('Review deleted successfully');
      },
      error: (error) => {
        console.error('Delete failed:', error);
        // Revert the UI change on error
        this.loadReviewsByPropertyId();
      },
    });
  }

  // Optimized statistics
  ratingPercentages: { [key: number]: number } = {};

  calculateReviewStats(): void {
    const totalReviews = this.reviews.length;
    if (totalReviews === 0) {
      this.ratingDistributionData = {};
      this.categoryAveragesData = {};
      this.ratingPercentages = {};
      this.overallRatingValue = 0;
      return;
    }

    // Overall Rating
    const totalRating = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.overallRatingValue = totalRating / totalReviews;

    // Distribution
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.reviews.forEach((r) => {
      const rating = Math.floor(r.rating);
      if (rating >= 1 && rating <= 5) distribution[rating]++;
    });
    this.ratingDistributionData = distribution;

    // Percentages
    const percentages: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      percentages[i] = (distribution[i] / totalReviews) * 100;
    }
    this.ratingPercentages = percentages;

    // Category Averages
    const categories = ['cleanliness', 'accuracy', 'checkIn', 'communication', 'location', 'value'];
    const averages: { [key: string]: number } = {};

    categories.forEach((category) => {
      const sum = this.reviews.reduce((acc, review) => {
        const value = review[category as keyof IGuestReviewDto] as number;
        return acc + (value || 0);
      }, 0);
      averages[category] = Number((sum / totalReviews).toFixed(1));
    });
    this.categoryAveragesData = averages;

    // Process visible reviews labels to avoid template calculations
    this.visibleReviews = this.reviews.slice(0, 6).map(review => ({
      ...review,
      daysAgoLabel: this.getDaysAgo(review.createdAt),
      stayDurationLabel: this.getStayDuration(review),
      fullName: this.getFullName(review.user.firstName, review.user.lastName),
      profileUrl: review.user.profilePictureURL ? this.getImageUrl(review.user.profilePictureURL) : null,
      id: review.id
    }));
  }

  get overallRating(): number { return this.overallRatingValue; }
  get distribution(): any { return this.ratingDistributionData; }
  get averages(): any { return this.categoryAveragesData; }
  get percentages(): any { return this.ratingPercentages; }
  deleteHandler(reviewId: number) {
    this.confirmService.show(
      'Delete Your Review?',
      'Are you sure you want to delete this review? This action cannot be undone.',
      () => this.performDelete(reviewId),
      {
        okText: 'Delete',
        cancelText: 'Cancel',
        isSuccess: false,
      }
    );
  }

  //   isCurrentUserReview(review: IGuestReviewDto): boolean {
  //   return this.currentUser === review.UserId;
  // }

  // Optional: Get user profile link for now after the profile is made it won't be optional
  getUserProfileLink(userId: string): string {
    return `/user/${userId}`;
  }

  // Helper methods for user display
  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) {
      return 'U'; // Default for unknown user
    }

    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';

    return firstInitial + lastInitial;
  }

  getFullName(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) {
      return 'Anonymous User';
    }

    return `${firstName || ''} ${lastName || ''}`.trim();
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      cleanliness: 'bi-droplet', // or 'bi-house-check'
      accuracy: 'bi-check-circle',
      checkIn: 'bi-key',
      communication: 'bi-chat-square-dots',
      location: 'bi-geo-alt',
      value: 'bi-tag',
    };
    return icons[category.toLowerCase()] || 'bi-star';
  }
  // Remove these as they were incorrectly initialized before data was loaded
  // and would cause errors or incorrect values.

  //for profile card

  hostInfo: any = null;
  hostStats: any = null;
  isLoadingHost: boolean = false;

  // Update your loadHostInformation method in GuestReviews component

  loadHostInfo(): void {
    if (!this.propertyId) return;

    this.isLoadingHost = true;

    this.PropertyService.getPropertyWithHostData(this.propertyId).subscribe({
      next: (property: PropertyDisplayWithHostDataDto) => {
        console.log('Property with host data:', property);

        this.hostInfo = {
          userId: property.host?.userId || property.hostId,
          firstName: property.host?.firstName || 'Host',
          lastName: property.host?.lastName || '',
          userName: property.host?.userName,
          email: property.host?.email,
          phoneNumber: property.host?.phoneNumber,
          profilePictureURL: property.host?.profilePictureURL,
          country: property.host?.country || property.country,
          description: property.host?.bio, // bio maps to description
          birthDate: property.host?.birthDate,
        };

        this.loadAllHostReviewsForStats(
          property.host?.userId || property.hostId
        );

        // this.calculateSimpleHostStats();

        this.isLoadingHost = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading host info:', error);
        this.isLoadingHost = false;
      },
    });
  }
  loadAllHostReviewsForStats(hostId: string): void {
    this.ReviewService.getHostReviewsWithProperties(hostId).subscribe({
      next: (allHostReviews: HostReviewDTO[]) => {
        this.calculateAccurateHostStats(allHostReviews);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading all host reviews:', error);
        // Fallback to simple calculation if this fails
        this.calculateSimpleHostStats();
      },
    });
  }
  calculateAccurateHostStats(allHostReviews: HostReviewDTO[]): void {
    if (allHostReviews.length === 0) {
      this.hostStats = {
        totalReviews: 0,
        averageRating: 0,
        monthsHosting: 1,
        totalProperties: 0,
      };
      return;
    }

    const totalRating = allHostReviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / allHostReviews.length;

    // Calculate months hosting from oldest review
    const oldestReview = allHostReviews.reduce((oldest, review) =>
      new Date(review.createdAt) < new Date(oldest.createdAt) ? review : oldest
    );
    const monthsHosting = Math.ceil(
      (Date.now() - new Date(oldestReview.createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 30)
    );

    // Count unique properties
    const uniqueProperties = new Set(
      allHostReviews.map((review) => review.propertyId)
    );

    this.hostStats = {
      totalReviews: allHostReviews.length,
      averageRating: Number(averageRating.toFixed(1)),
      monthsHosting: monthsHosting,
      totalProperties: uniqueProperties.size,
    };
  }
  calculateSimpleHostStats(): void {
    // Simple calculation from current reviews
    const hostReviews = this.reviews.length;
    const totalRating = this.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = hostReviews > 0 ? totalRating / hostReviews : 0;

    // Simple months calculation (assume 1 months if no specific data)
    const monthsHosting = 1;

    this.hostStats = {
      totalReviews: hostReviews,
      averageRating: Number(averageRating.toFixed(1)),
      monthsHosting: monthsHosting,
    };
  }

  onHostImageError = (event: any, item: any): void => {
    this.imageErrors.add(item.id);
    this.cdr.detectChanges();
  };

  isHostSuperhost(): boolean {
    return (
      this.hostStats?.averageRating >= 4.8 && this.hostStats?.totalReviews >= 5
    );
  }

  getDaysAgo(dateString: string): string {
    const reviewDate = new Date(dateString);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - reviewDate.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

    if (daysDifference === 0) {
      return 'Today';
    } else if (daysDifference === 1) {
      return '1 day ago';
    } else if (daysDifference < 7) {
      return `${daysDifference} days ago`;
    } else if (daysDifference < 14) {
      return '1 week ago';
    } else if (daysDifference < 30) {
      const weeksAgo = Math.floor(daysDifference / 7);
      return `${weeksAgo} weeks ago`;
    } else if (daysDifference < 365) {
      const monthsAgo = Math.floor(daysDifference / 30);
      return monthsAgo === 1 ? '1 month ago' : `${monthsAgo} months ago`;
    } else {
      const yearsAgo = Math.floor(daysDifference / 365);
      return yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;
    }
  }

  getStayDuration(review: IGuestReviewDto): string {
    if (this.userBookings && this.userBookings.length > 0) {
      const booking = this.userBookings.find(
        (b) =>
          b.propertyId === this.propertyId && b.userId === review.user.userId
      );

      if (booking) {
        return this.calculateStayText(
          booking.checkInDate,
          booking.checkOutDate
        );
      }
    }
    return 'Guest stay';
  }

  private calculateStayText(checkInDate: string, checkOutDate: string): string {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDifference = checkOut.getTime() - checkIn.getTime();
    const nights = Math.floor(timeDifference / (1000 * 3600 * 24));

    if (nights === 1) {
      return 'Stayed 1 night';
    } else if (nights === 2) {
      return 'Stayed a couple nights';
    } else if (nights <= 4) {
      return 'Stayed a few nights';
    } else if (nights <= 7) {
      return 'Stayed a week';
    } else if (nights <= 14) {
      return 'Stayed a couple weeks';
    } else if (nights <= 30) {
      return 'Stayed a few weeks';
    } else {
      return 'Extended stay';
    }
  }
}
