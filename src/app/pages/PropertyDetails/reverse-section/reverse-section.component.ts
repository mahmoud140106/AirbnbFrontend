import { DialogService } from './../../../core/services/dialog.service';
import { CommonPropInfoService } from './../../property-info/common-prop-info-service';
import { CommonModule } from '@angular/common';
import { Property } from './../../../core/models/Property'; // Assuming this path is correct
import { PropertyService } from './../../../core/services/Property/property.service';
import { BookingDTO, BookingService } from '../../../core/services/Booking/booking.service';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  output,
  Output,
  ViewChild,
  viewChild,
  input,
  AfterViewInit,
} from '@angular/core';


import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  CalendarAvailabilityDto,
  CalendarAvailabilityService,
} from '../../../core/services/CalendarAvailability/calendar-availability.service';
import { OnChanges, SimpleChanges } from '@angular/core';
import moment from 'moment';
import { range } from '../BookingCalendar/BookingCalendar.component';
import {
  DaterangepickerComponent,
  DaterangepickerDirective,
  NgxDaterangepickerMd,
} from 'ngx-daterangepicker-material';
// import { DpDatePickerModule } from 'ng2-date-picker';
import dayjs, { Dayjs } from 'dayjs';
import { ChatService } from '../../../core/services/Message/message.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CreatePaymentDTO, PaymentService } from '../../../core/services/payment/payment';
import { AuthService } from '../../../core/services/auth.service';

import { ViolationModal } from "../violation-modal/violation-modal";
import { ReserveConfirmModal } from "../reserve-confirm-modal/reserve-confirm-modal";
import { ConfirmService } from '../../../core/services/confirm.service';


import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { MatSnackBar } from '@angular/material/snack-bar';

// Enable UTC plugin
dayjs.extend(utc);
dayjs.extend(timezone);
@Component({
  selector: 'app-reverse-section',
  imports: [CommonModule, FormsModule, NgxDaterangepickerMd, ViolationModal, ReserveConfirmModal],
  templateUrl: './reverse-section.component.html',
  styleUrls: ['./reverse-section.component.css'],
})
// export class ReverseSectionComponent implements OnInit, OnChanges {
//   showViolationModal: boolean = false;
//   constructor(
//     private propertyService: PropertyService,
//     private bookingService: BookingService,
//     private calendarService: CalendarAvailabilityService,
//     private cdr: ChangeDetectorRef,
//     private commonService: CommonPropInfoService,
//     private chatService: ChatService,
//     private route: ActivatedRoute, // used to read current route params
//     private router: Router,
//     private paymentService: PaymentService,
//     private auth: AuthService,
//     private dialogService: DialogService,
//     private snackBar: MatSnackBar
//   ) {}

//   private showToast(
//     message: string,
//     vertical: 'top' | 'bottom',
//     horizontal: 'left' | 'right'
//   ) {
//     this.snackBar.open(message, 'Close', {
//       duration: 3000,
//       horizontalPosition: horizontal,
//       verticalPosition: vertical,
//       panelClass: ['custom-snackbar'],
//     });
//   }
//   @Input() checkIn?: dayjs.Dayjs;
//   @Input() checkOut?: dayjs.Dayjs;
//   @Input() propertyId!: number;
//   @Input() isPreview: boolean = false;
//   @Input() hostID!: string;

//   @Output() guestChange = new EventEmitter<{
//     adults: number;
//     children: number;
//     // infants: number;
//   }>();

//   @Input() dateMap?: Map<string, CalendarAvailabilityDto>;
//   @Output() dateChange = new EventEmitter<range>();

//   @Input() guests: {
//     adults: number;
//     children: number;
//     // infants: number;
//   } = { adults: 1, children: 0 }; // Default values

//   @ViewChild('picker', { read: DaterangepickerDirective })
//   picker!: DaterangepickerDirective;

//   @ViewChild('element') elemnt!: any;


export class ReverseSectionComponent implements OnInit, OnChanges {
  showViolationModal: boolean = false
  showConfirmModal: boolean = false
  nightsCount: number = 1
  constructor(
    private propertyService: PropertyService,
    private bookingService: BookingService,
    private calendarService: CalendarAvailabilityService,
    private cdr: ChangeDetectorRef,
    private commonService: CommonPropInfoService,
    private chatService: ChatService,
    private route: ActivatedRoute,  // used to read current route params
    private router: Router,
    private paymentService: PaymentService,
    private auth: AuthService,
    private dialogService: DialogService,
    private confirmService: ConfirmService,
    private snackBar: MatSnackBar

  ) { }

  private showToast(
    message: string,
    vertical: 'top' | 'bottom',
    horizontal: 'left' | 'right'
  ) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: horizontal,
      verticalPosition: vertical,
      panelClass: ['custom-snackbar'],
    });
  }
  @Input() checkIn?: dayjs.Dayjs;
  @Input() checkOut?: dayjs.Dayjs;
  @Input() propertyId!: number;
  @Input() isPreview: boolean = false
  @Input() hostID!: string;

  @Output() guestChange = new EventEmitter<{
    adults: number;
    children: number;
    // infants: number;
  }>();

  @Input() dateMap?: Map<string, CalendarAvailabilityDto>
  @Output() dateChange = new EventEmitter<range>()

  @Input() guests: {
    adults: number;
    children: number;
    // infants: number;
  } = { adults: 1, children: 0 }; // Default values

  @ViewChild('picker', { read: DaterangepickerDirective }) picker!: DaterangepickerDirective;

  @ViewChild("element") elemnt!: any

  clickedDate?: dayjs.Dayjs
  firstUnavailableDate?: dayjs.Dayjs

  public Message: string = '';

  displayMonths = 2;

  @Output() reserveClicked = new EventEmitter<any>();

  showReservationMessage: boolean = false;
  specialPriceFromAvailable !: any;


  ngOnInit() {
    this.commonService.clear$.subscribe(() => {
      this.clear();
    });
    console.log('from ReserveOnInit', this.checkIn, this.checkOut);
    console.log('property id ', this.propertyId);
    console.log('host id ', this.hostID);

    this.selected = {
      startDate: undefined,
      endDate: undefined,
    };
    console.log(
      'selected dates from on init reserve component  ',
      this.selected.startDate,
      'and ',
      this.selected.endDate
    );
    // this.picker.nativeElement.nextElementSibling
    // console.log("this.picker.nativeElement.nextElementSibling",this.picker)
    // console.log("this.picker.nativeElement.nextElementSibling",this.elemnt)
    if (!this.propertyId) {
      console.error('Property ID is required for ReverseSectionComponent');
    }
    this.propertyService.getPropertyById(this.propertyId).subscribe({
      next: (property: Property) => {
        this.property = property;
        this.maxGuests = property.maxGuests;
        console.log("fetched property", property)
        this.pricePerNight = property.pricePerNight
        this.totalPrice = this.pricePerNight
        console.log("price per neight ", this.pricePerNight) // ✅ update maxGuests from backend

      },
      error: (err) => {
        console.error('Failed to load property data', err);
      },
    });

    // this.generateCalendarDays();
    // console.log("form reserve-section onInit")
    console.log('form reserve-section onInit');
    console.log(
      'selected dates from on init reserve component  ',
      this.selected.startDate,
      'and ',
      this.selected.endDate
    );
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   // console.log("this.picker.nativeElement.nextElementSibling",this.picker)
  //   // console.log("this.picker.nativeElement.nextElementSibling",this.elemnt)

  //   if (changes['checkIn'] && changes['checkOut'])
  //     this.selected = {
  //       startDate: changes['checkIn'].currentValue,
  //       endDate: changes['checkOut'].currentValue,
  //     };

  //   // let x = {startDate:undefined,endDate:undefined}
  //   // if (changes['checkIn']) {
  //   //   // console.log('checkIn input changed:', this.checkIn);
  //   //   x.startDate = changes['checkIn'].currentValue
  //   // }
  //   // if (changes['checkOut']) {
  //   //   x.endDate = changes['checkOut'].currentValue

  //   //   // console.log('checkOut input changed:', this.checkOut);
  //   // }

  //   // this.selected=x;
  //   console.log(
  //     this.selected.startDate,
  //     ' fom on changes in reserve section',
  //     this.selected.endDate
  //   );
  //   // console.log(this.picker)
  //   this.picker.hide();

  //   this.checkAvailabilityForSelectedRange();
  //   // this.picker.nativeElement.nextElementSibling.setStartDate( dayjs(x.startDate.toDate()));
  //   // this.picker.nativeElement.nextElementSibling.setEndDate( dayjs(x.endDate.toDate()));
  // }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['checkIn'] && changes['checkOut'])
      this.selected = {
        startDate: changes['checkIn'].currentValue,
        endDate: changes['checkOut'].currentValue,
      };

    console.log(
      this.selected.startDate,
      ' from on changes in reserve section',
      this.selected.endDate
    );

    this.picker.hide();
    this.checkAvailabilityForSelectedRange();

    if (changes['dateMap'] || changes['checkIn'] || changes['checkOut']) {
      this.calculateTotalPrice();
    }
  }
  @HostListener('window:resize', [])
  onResize() {
    this.updateDisplayMonths();
  }

  isInvalidDate = (date: dayjs.Dayjs): boolean => {
    // console.log("selected start date is ", this.selected.startDate)
    // if(this.clickedDate ){
    //   if(date.isBefore(this.clickedDate))
    //     return true
    //   if(!this.firstUnavailableDate)
    //     return false
    //   if(date.isBefore(this.firstUnavailableDate))
    //     return false
    //   return true
    // }
    if (date.isBefore(dayjs(), 'day')) return true;

    if (this.dateMap) {
      const dateKey = date.format('YYYY-MM-DD');
      const availabilityData = this.dateMap.get(dateKey);

      if (availabilityData && availabilityData.isAvailable === false) {
        return true;
      }
    }

    return false;

    // if (date.isBefore(dayjs())) return true;
    // if (this.dateMap) {
    //   // if( !(this.dateMap.get(date.toString())?.isAvailable?? true))
    //   // console.log(date, (this.dateMap.get(date.toISOString().slice(0,19))?.isAvailable))
    //   return !(
    //     this.dateMap.get(date.toISOString().slice(0, 19))?.isAvailable ?? true
    //   );
    // }
    // // .some(d => dayjs(d.date).isSame(date, 'day') && d.isAvailable )
    // return false;
  };

  onStartDateChange(clickedDate: any) {
    // this.clickedDate = clickedDate?.startDate?? undefined
    // if(this.clickedDate)
    // {
    //   let date ;
    //   for(let i=1;  this.dateMap && i < this.dateMap.size  ;i++)
    //   {
    //     date =  this.dateMap?.get( dayjs(this.clickedDate)
    //                                     .add(i,"day")
    //                                     .toISOString().slice(0,19)
    //                           )
    //     if(date && !date.isAvailable){
    //         this.firstUnavailableDate = dayjs(date.date)
    //         console.log("firstUnavailableDate",this.firstUnavailableDate)
    //         break;
    //     }
    //   }
    // }else
    //   this.firstUnavailableDate = undefined
  }

  onClear() {
    this.clear();
    this.commonService.clear();
  }
  clear() {
    console.log('clear');
    this.selected = {
      endDate: undefined,
      startDate: undefined,
    };
    this.picker.picker.clear();

    this.dateChange.emit({
      startDate: this.selected.startDate,
      endDate: this.selected.startDate,
    });
  }
  updateDisplayMonths() {
    this.displayMonths = window.innerWidth < 768 ? 1 : 2;
  }
  selected: { startDate?: dayjs.Dayjs; endDate?: dayjs.Dayjs } = {
    startDate: undefined,
    endDate: undefined,
  };
  ranges: any = {
    Today: [moment().add(1, 'month'), moment().add(1, 'month')],
    Yesterday: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
    'Last 7 Days': [moment().subtract(6, 'days'), moment()],
    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
    'This Month': [moment().startOf('month'), moment().endOf('month')],
    'Last Month': [
      moment().subtract(1, 'month').startOf('month'),
      moment().subtract(1, 'month').endOf('month'),
    ],
  };

  locale = {
    format: 'YYYY-MM-D',
    applyLabel: 'Apply',
    cancelLabel: 'Cancel',
    customRangeLabel: 'Custom',
  };

  selectedDateRange = {
    startDate: null as string | null,
    endDate: null as string | null,
  };

  property: any;
  maxGuests!: number;
  totalPrice: any;
  guestCount: number = 1;
  pricePerNight: number = 120; //test
  errorMessage: string | null = null;
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  showGuestDropdown = false;

  isDateRangeAvailable: boolean | null = null;
  unavailableDates: string[] = [];

  onDatesChanged(range: range) {
    this.firstUnavailableDate = undefined;
    this.clickedDate = undefined;
    this.dateChange.emit(range);
    // this.picker.clear()
    console.log('on dates changes ', range);
    console.log('on date changed ', this.clickedDate);

    this.calculateTotalPrice();
  }

  // Calendar properties
  currentMonth: Date = new Date();
  weekDays: string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  currentMonthDays: any[] = [];
  nextMonthDays: any[] = [];
  showNextMonth: boolean = true; // Always show next month as per image

  generateCalendarDays(): void {
    const currentMonthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const nextMonthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );

    const currentMonthEnd = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() + 1,
      0
    );
    const nextMonthEnd = new Date(
      nextMonthStart.getFullYear(),
      nextMonthStart.getMonth() + 1,
      0
    );

    const format = (d: Date) => d.toISOString().split('T')[0];

    this.calendarService
      .getAvailability(
        this.propertyId,
        format(currentMonthStart),
        format(nextMonthEnd)
      )
      .subscribe((data) => {
        // console.log("data from generatecalender days ")
        const availabilityMap = new Map<string, CalendarAvailabilityDto>();
        data.forEach((item) => {
          availabilityMap.set(item.date, item);
        });

        this.currentMonthDays = this.getDaysInMonth(
          currentMonthStart,
          availabilityMap
        );
        this.nextMonthDays = this.getDaysInMonth(
          nextMonthStart,
          availabilityMap
        );
      });
  }

  getDaysInMonth(
    date: Date,
    availabilityMap: Map<string, CalendarAvailabilityDto>
  ): any[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: any[] = [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ empty: true });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const current = new Date(year, month, i);
      const dateStr = current.toISOString().split('T')[0];
      const availability = availabilityMap.get(dateStr);

      days.push({
        date: current,
        available: availability ? availability.isAvailable : false,
        price: availability?.price ?? null,
        disabled: !availability?.isAvailable || current < today,
      });
    }

    return days;
  }

  //when user select dates
  selectDate(date: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for accurate comparison

    if (date < today) {
      this.showToast('You cannot select a past date.', 'bottom', 'left');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const allDays = [...this.currentMonthDays, ...this.nextMonthDays];
    const selectedDay = allDays.find(
      (d) => d.date && this.isSameDay(d.date, date)
    );

    if (!selectedDay || selectedDay.disabled) {
      this.showToast('Selected date is unavailable.', 'bottom', 'left');
      return;
    }

    if (!this.checkInDate || this.checkOutDate) {
      this.checkInDate = date;
      this.checkOutDate = null;
      this.totalPrice = null;
    } else if (date > this.checkInDate) {
      if (this.validateDateRange(this.checkInDate, date)) {
        this.checkOutDate = date;
        // this.calculateTotalPrice(this.checkInDate, this.checkOutDate);
      } else {
        const suggestion = this.findClosestAvailableRange(
          this.checkInDate,
          allDays
        );
        this.showToast(
          `Selected range is unavailable. Try from ${suggestion.start.toDateString()} to ${suggestion.end.toDateString()}`,
          'bottom',
          'left'
        );
      }
    } else {
      this.checkInDate = date;
      this.checkOutDate = null;
      this.totalPrice = null;
    }
  }

  findClosestAvailableRange(
    start: Date,
    allDays: any[]
  ): { start: Date; end: Date } {
    const sorted = allDays
      .filter((d) => d.date && d.available)
      .sort((a, b) => +a.date - +b.date);

    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i].date;
      const next = sorted[i + 1].date;
      const diff = (next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        return { start: curr, end: next };
      }
    }

    return { start: start, end: start };
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  validateDateRange(start: Date, end: Date): boolean {
    const allDays = [...this.currentMonthDays, ...this.nextMonthDays];
    for (let day of allDays) {
      if (day.date && day.date > start && day.date < end && day.disabled) {
        return false;
      }
    }
    return true;
  }

  isCheckIn(date: Date): boolean {
    // console.log(" date that is parameter to ischeckin",date);
    return this.checkInDate ? this.isSameDay(this.checkInDate, date) : false;
    console.log('checkin date ', this.checkInDate);
  }

  isCheckOut(date: Date): boolean {
    console.log(' date that is parameter to ischeck out', date);

    return this.checkOutDate ? this.isSameDay(this.checkOutDate, date) : false;
    console.log('checkin date ', this.checkOutDate);
  }

  toggleGuestDropdown(): void {
    this.showGuestDropdown = !this.showGuestDropdown;
  }

  updateGuests(type: 'adults' | 'children', delta: number): void {
    const currentCount = this.guests[type];
    const newCount = currentCount + delta;
    console.log(currentCount);
    // Prevent going below limits of max in property
    if (
      (type === 'adults' && newCount < 1) ||
      (type === 'children' && newCount < 0)
    ) {
      return;
    }
    // Calculate new total guest count after applying delta
    const newGuestTotals = {
      ...this.guests,
      [type]: newCount,
    };
    this.calculateTotalPrice();
    const totalGuests = newGuestTotals.adults + newGuestTotals.children;
    // Check if total exceeds max allowed
    if (totalGuests > this.maxGuests) {
      this.errorMessage = `Maximum ${this.maxGuests} guests allowed (excluding infants).`;
      return;
    }

    console.log(totalGuests);

    //  Only update guest data after validation
    this.guests = newGuestTotals;
    this.guestCount = totalGuests;
    this.errorMessage = null;
    this.guestChange.emit(this.guests);

    // ✅ Recalculate price after updating data
    this.calculateTotalPrice();
    console.log('💰 Total price recalculated: ', this.totalPrice);
  }

  //   calculateTotalPrice(): void {

  //         if (!this.selected?.startDate || !this.selected?.endDate) return;

  //         const start = dayjs(this.selected.startDate);
  //         const end = dayjs(this.selected.endDate);
  //         const numberOfNights = end.diff(start, 'day');
  //         this.nightsCount = numberOfNights
  //         if (numberOfNights <= 0) {
  //           this.totalPrice = 0;
  //           return;
  //         }
  //         const guestCount = (this.guests?.adults || 0) + (this.guests?.children || 0);
  //         console.log(guestCount);

  //         let totalNightly = 0;
  //         // for (let d = start; d.isBefore(end); d = d.add(1, 'day')) {
  //         //   const dateStr = d.format('YYYY-MM-DD');
  //         //   const matchedDay = this.availability?.find(day => day.date === dateStr);
  //         //   const priceForDay = matchedDay?.price ?? this.property.pricePerNight;
  //         //   totalNightly += priceForDay;
  //         // }
  //             const BasePrice = numberOfNights *this.pricePerNight;
  //       console.log("number of neights  from total price " ,numberOfNights)
  //         this.totalPrice = BasePrice ;

  //         console.log("💰 Total price recalculated   print :", this.totalPrice);
  // }


  calculateTotalPrice(): void {
    console.log("start calculatePrice", !this.selected?.startDate, !this.selected?.endDate, !this.dateMap)
    if (!this.selected?.startDate || !this.selected?.endDate || !this.dateMap) return;

    const start = dayjs(this.selected.startDate);
    const end = dayjs(this.selected.endDate);

    const numberOfNights = end.diff(start, 'day');
    this.nightsCount = numberOfNights;

    console.log(`📅 Check-in: ${start.format('YYYY-MM-DD')}`);
    console.log(`📅 Check-out: ${end.format('YYYY-MM-DD')}`);
    console.log(`🌙 Number of nights: ${numberOfNights}`);

    if (numberOfNights <= 0) {
      this.totalPrice = 0;
      return;
    }

    let totalNightly = 0;

    let currentDate = start.clone();
    for (let i = 0; i < numberOfNights; i++) {
      const key = currentDate.format('YYYY-MM-DD');
      const availabilityItem = this.dateMap.get(key);
      const priceForDay = availabilityItem?.price ?? this.pricePerNight;
      totalNightly += priceForDay;

      console.log(`🗓️ Adding price for day: ${key} = ${priceForDay} EGP`);

      currentDate = currentDate.add(1, 'day');
    }

    this.totalPrice = totalNightly;
    console.log(`💰 Total price: ${this.totalPrice} EGP for ${numberOfNights} day(s)`);
  }

  get totalGuests(): string {
    const total = this.guests.adults + this.guests.children;
    let text = `${total} guest${total !== 1 ? 's' : ''}`;
    // if (this.guests.infants > 0) {
    //   text += `, ${this.guests.infants} infant${this.guests.infants !== 1 ? 's' : ''}`;
    // }
    return text;
  }


  checkAvailabilityForSelectedRange(): void {
    console.log('reserve button clicked ');
    console.log(' elected range ', this.selected);
    const startDate = dayjs(this.selected.startDate);
    const endDate = dayjs(this.selected.endDate);
    console.log('before format ', startDate);
    console.log('before format ', endDate);
    const formattedStart = startDate.format('YYYY-MM-DD');
    const formattedEnd = endDate.format('YYYY-MM-DD');
    console.log('format start', formattedStart);
    console.log('format end', formattedEnd);

    const guestCount =
      (this.guests?.adults || 0) + (this.guests?.children || 0);
    console.log(guestCount);
    const clicked = dayjs(this.clickedDate).format('YYYY-MM-DD');


    this.guestCount = guestCount
    // this.calendarService.getAvailability(this.propertyId, formattedStart, formattedEnd).subscribe((availability: CalendarAvailabilityDto[]) => {
    // const allAvailable = availability.every(day => day.isAvailable);
    // this.isDateRangeAvailable = allAvailable;

    // if(startDate ==undefined || endDate == undefined) return;
    this.calculateTotalPrice(); // assumes this.totalPrice is calculated

  }


  // onReserveConfirmClick() {

  //   let userId = this.auth.userId;

  //   if (!userId) {
  //     console.log("User not logged in. Opening login dialog...");
  //     this.dialogService.openDialog('login');
  //     return;
  //   }
  //   const startDate = dayjs(this.selected.startDate);
  //   const endDate = dayjs(this.selected.endDate);
  //   const guestCount = (this.guests?.adults || 0) + (this.guests?.children || 0);
  //   this.guestCount = guestCount

  //   // const formattedStart = startDate.format('YYYY-MM-DD');
  //   // const formattedEnd = endDate.format('YYYY-MM-DD');


  //   console.log("utc string", startDate.utc().format())
  //   let bookingDTO: BookingDTO = {
  //     propertyId: this.propertyId,
  //     userId: userId,
  //     checkInDate: startDate.utc().format(),
  //     checkOutDate: endDate.utc().format(),
  //     numberOfGuests: guestCount,
  //   };

  //   this.bookingService.createBooking(bookingDTO).subscribe(bookingRes => {
  //     console.log("booking result", bookingRes);

  //     const bookingId = bookingRes.data;
  //     // const totalAmount = bookingRes.data.totalPrice;
  //     let createPaymentDto: CreatePaymentDTO = {
  //       bookingId: bookingId,
  //       amount: 0
  //     }
  //     this.paymentService.createCheckout(createPaymentDto).subscribe({
  //       next: (res) => {
  //         console.log("payment service ", res);
  //         this.confirmService.success("Reservation completed", "", () => {
  //           window.location.href = res.url;
  //           // this.router.navigateByUrl(res.url)
  //         })



  //       },
  //       error: (err) => {
  //         this.confirmService.fail("Failed", "")
  //         console.error("Checkout session creation failed", err);
  //       }
  //     });

  //     // if(startDate ==undefined || endDate == undefined) return;
  //     this.calculateTotalPrice(); // assumes this.totalPrice is calculated
  //     let userId = this.auth.userId;

  //     if (!userId) {
  //       console.log('there is no userid'); //login
  //       return;
  //     }
  //     //     let bookingDTO: BookingDTO = {
  //     //       propertyId: this.propertyId,
  //     //       userId:userId,
  //     //       checkInDate: startDate.toDate().toUTCString(),
  //     //       checkOutDate: endDate.toDate().toUTCString(),
  //     //       numberOfGuests: guestCount,
  //     //     };

  //     // this.bookingService.createBooking(bookingDTO).subscribe(bookingRes => {
  //     //     console.log("booking result" ,bookingRes);

  //     //   const bookingId = bookingRes.data.id;
  //     //   const totalAmount = bookingRes.data.totalPrice;


  //   });
  // }

  onReserveConfirmClick() {
    let userId = this.auth.userId;

    if (!userId) {
      console.log("User not logged in. Opening login dialog...");
      this.dialogService.openDialog('login');
      return;
    }

    const startDate = dayjs(this.selected.startDate);
    const endDate = dayjs(this.selected.endDate);
    const guestCount = (this.guests?.adults || 0) + (this.guests?.children || 0);
    this.guestCount = guestCount;

    console.log("UTC string", startDate.utc().format());

    let bookingDTO: BookingDTO = {
      propertyId: this.propertyId,
      userId: userId,
      checkInDate: startDate.utc().format(),
      checkOutDate: endDate.utc().format(),
      numberOfGuests: guestCount,
    };

    this.bookingService.createBooking(bookingDTO).subscribe({
      next: (bookingRes) => {
        console.log("Booking result", bookingRes);

        const bookingId = bookingRes.data;
        let createPaymentDto: CreatePaymentDTO = {
          bookingId: bookingId,
          amount: this.totalPrice
        }

        this.paymentService.createCheckout(createPaymentDto).subscribe({
          next: (res) => {
            console.log("Payment service", res);
            this.confirmService.success("Reservation completed", "", () => {
              window.location.href = res.url;
            });
          },
          error: (err) => {
            this.confirmService.fail("Failed", "");
            console.error("Checkout session creation failed", err);
          }
        });
      },
      error: (err) => {
        console.error("Booking creation failed", err);
        this.confirmService.fail("Booking Failed", "");
      }
    });
  }
  // reserveFunction() :void{
  //       let userId=this.auth.userId;

  //     if (!this.auth.accessToken || !userId )
  //       {
  //         console.log("User not logged in. Opening login dialog...");
  //         // this.dialogService.openDialog('login');
  //         return;
  //       }

  //     let bookingDTO: BookingDTO = {
  //         propertyId: this.propertyId,
  //         userId:userId,
  //         checkInDate: startDate.toDate().toUTCString(),
  //         checkOutDate: endDate.toDate().toUTCString(),
  //         numberOfGuests: guestCount,
  //       };

  //   this.bookingService.createBooking(bookingDTO).subscribe(bookingRes => {
  //       console.log("booking result" ,bookingRes);

  //     const bookingId = bookingRes.data.id;
  //     const totalAmount = bookingRes.data.totalPrice;

  //     this.paymentService.createCheckout(bookingId).subscribe({
  //       next: (res) => {
  //         console.log("payment service ",res);

  //         window.location.href = res.url;




  showViolationModalFn() {
    if (!this.auth.userId) {
      this.dialogService.openDialog('login');
      return;
    }
    console.log(this.showViolationModal);
    this.showViolationModal = true;
  }

  closeViolationModal() {
    this.showViolationModal = false;
  }

  onShowConfirmModal() {
    this.showConfirmModal = true
  }
  onCloseConfirmModal() {
    this.showConfirmModal = false
  }

}
