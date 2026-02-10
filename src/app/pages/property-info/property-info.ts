import { Property } from './../../core/models/Property';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PropertyService } from '../../core/services/Property/property.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Routes } from '@angular/router';
import { PropertImageGalaryComponent } from "../PropertyDetails/propertImage-galary/propertImage-galary.component";
import { ReverseSectionComponent } from "../PropertyDetails/reverse-section/reverse-section.component";
import { AmenitiesSectionComponent } from '../PropertyDetails/amenities-section/amenities-section.component';
import { BookingCalendarComponent, range } from "../PropertyDetails/BookingCalendar/BookingCalendar.component";
import { MapLocationComponent } from "../PropertyDetails/mapLocation/mapLocation.component";
import { GuestReviews } from "../../components/guest-reviews/guest-reviews";
import moment from 'moment';
import dayjs from 'dayjs';
import { CalendarAvailabilityDto, CalendarAvailabilityService } from '../../core/services/CalendarAvailability/calendar-availability.service';
import { WishListModal } from "../../components/wish-list-modal/wish-list-modal";
import { WishlistService } from '../../core/services/Wishlist/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { ChatBot } from "../../components/chat-bot/chat-bot";

// interface CalendarAvailability{
//   price:number;
//   isAvailable:boolean
//   date:dayjs.Dayjs
// }
@Component({
  selector: 'app-property-info',
  imports: [CommonModule, PropertImageGalaryComponent, ReverseSectionComponent, AmenitiesSectionComponent, BookingCalendarComponent, MapLocationComponent, GuestReviews, WishListModal, ChatBot],
  templateUrl: './property-info.html',
  styleUrl: './property-info.css'
})



export class PropertyInfo implements OnInit {

  // properties: Property[] = [];
  selectedProperty: Property | undefined;
  isLoading = true;
  error: string | null = null;
  firstCalendarDate = dayjs().add(-5, 'months')
  lastCalendarDate = dayjs().add(1, 'year')
  availability!: CalendarAvailabilityDto[]
  dateMap?: Map<string, CalendarAvailabilityDto>
  //to link reverse with calender
  propertyId!: number;
  selectedDates!: { start?: dayjs.Dayjs, end?: dayjs.Dayjs };
  guestCount = {
    adults: 1,
    children: 0,
    // infants: 0
  }

  hostID!: string;


  @Input() checkIn!: string;
  @Input() checkOut!: string;
  @Input() guests!: { adults: number, children: number };
  @Input() previewPropertyId?: number
  @Output() guestChange = new EventEmitter<{
    adults: number;
    children: number
  }>();
  @Input() isPreview: boolean = false

  // State for child components
  activeTab: 'gallery' | 'reviews' | 'amenities' = 'gallery';
  property: any;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private calendarService: CalendarAvailabilityService,

    private wishlistService: WishlistService,
    public authService: AuthService,
    private dialogService: DialogService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.selectedDates = {
      start: undefined,
      end: undefined
    }
    this.route.params.subscribe(params => {
      this.propertyId = +params['propertyId']; // Get propertyId from route params
      if (this.propertyId <= 0 && (!this.previewPropertyId || this.previewPropertyId)) {

        this.error = 'Invalid property ID';
        this.isLoading = false;
        return;
      } else if (this.previewPropertyId)
        this.propertyId = this.previewPropertyId

      // console.log('Property ID from route:', this.propertyId);
      this.showPropertyDetails(this.propertyId);
      this.getCalendarAvailability()

    });


  }

  getCalendarAvailability() {
    this.calendarService.getAvailability(
      this.propertyId,
      this.firstCalendarDate.toString(),
      this.lastCalendarDate.toString()
    ).subscribe({
      next: (res) => {
        console.log("getCalendarAvailability", res)
        console.log("date.toString", dayjs().toISOString())
        this.availability = res;
        const dateMap = new Map<string, CalendarAvailabilityDto>();

        res.forEach(item => {
          // dateMap.set(item.date.slice(0, 19), item);
          const dateOnly = dayjs(item.date).format('YYYY-MM-DD');
          dateMap.set(dateOnly, item);
        });
        console.log(dateMap)
        this.dateMap = dateMap;
        this.cdr.detectChanges()
      },
      error: () => { }
    })

  }


  showPropertyDetails(id: number): void {
    this.propertyService.getPropertyById(id).subscribe({
      next: (property) => {
        this.selectedProperty = property;
        console.log('Selected property:', this.selectedProperty);
        console.log(id);
        this.cdr.detectChanges()

      },
      error: (err) => {
        this.error = 'Failed to load property details';
        console.error(err);
      }
    });
  }


  changeTab(tab: 'gallery' | 'reviews' | 'amenities'): void {
    this.activeTab = tab;
  }


  onGuestUpdate(type: 'adults' | 'children', delta: number) {
    this.guests[type] += delta;
    this.guestChange.emit(this.guests);
  }


  isInvalidDate = (date: dayjs.Dayjs): boolean => {
    return (
      this.availability.some(d => dayjs(d.date).isSame(date, 'day') && d.isAvailable)

    );
  };

  customClasses = (date: dayjs.Dayjs): string => {
    if (this.availability.some(d => dayjs(d.date).isSame(date, 'day') && d.isAvailable)) {
      return 'blocked-line';
    }
    return ''; // no class for normal blocked dates
  };


  //  onDateSelected(range: { start: string; end: string }) {
  //     this.selectedDates = {
  //       start: range.start,
  //       end: range.end
  //     };
  //   }

  // Handle guest update from Reverse Section
  onGuestChange(updatedGuests: { adults: number; children: number }) {
    this.guestCount = updatedGuests;
  }


  onDateChange(range: range) {
    // console.log("from the parent's onDateChange", range)
    this.selectedDates.start = range?.startDate//moment(range?.startDate?.toDate())
    this.selectedDates.end = range.endDate//moment(range?.endDate?.toDate())

    // this.cdr.detectChanges()

  }



  selectedPropertyId!: number;
  showWishlistModal = false;

  onWishlistClick(id: number) {
    if (!this.authService.userId) {
      this.showToast(this.translate.instant('HOME.TOAST.LOGIN_REQUIRED'), 'top', 'right');
      this.dialogService.openDialog('login');
      return;
    }

    if (this.selectedProperty?.isFavourite) {
      this.removeFromWishlist(id);
    } else {
      this.selectedPropertyId = id;
      this.showWishlistModal = true;
    }
  }

  removeFromWishlist(propertyId: number) {
    this.wishlistService.removePropertyFromWishlist(propertyId).subscribe({
      next: (success) => {
        if (success && this.selectedProperty?.id === propertyId) {
          this.selectedProperty.isFavourite = false;
          this.showToast(this.translate.instant('HOME.TOAST.REMOVED'), 'bottom', 'left');
        } else {
          this.showToast(this.translate.instant('HOME.TOAST.REMOVE_FAILED'), 'bottom', 'left');
        }
      },
      error: () => {
        this.showToast(this.translate.instant('HOME.TOAST.REMOVE_FAILED'), 'bottom', 'left');
      },
    });
  }

  onFinish(observable: Observable<boolean>) {
    this.onClose();
    observable.subscribe({
      next: (success) => {
        if (success && this.selectedProperty?.id === this.selectedPropertyId) {
          this.selectedProperty.isFavourite = true;
          this.showToast(this.translate.instant('HOME.TOAST.ADDED'), 'bottom', 'left');
        } else {
          this.showToast(this.translate.instant('HOME.TOAST.ADD_FAILED'), 'bottom', 'left');
        }
      },
      error: () => {
        this.showToast(this.translate.instant('HOME.TOAST.ADD_FAILED'), 'bottom', 'left');
      },
    });
  }

  onClose() {
    this.showWishlistModal = false;
  }

  private showToast(message: string, vertical: 'top' | 'bottom', horizontal: 'left' | 'right') {
    this.snackBar.open(message, this.translate.instant('HOME.TOAST.OK'), {
      duration: 3000,
      horizontalPosition: horizontal,
      verticalPosition: vertical,
      panelClass: ['custom-snackbar'],
    });
  }

}
