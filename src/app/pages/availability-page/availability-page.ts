import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addDays, format, isSameDay } from 'date-fns';
import { CalendarComponent, CalendarSettings, DayAvailability } from "../../components/calendar/calendar";
import { CalendarDateDTO, CalendarService } from '../../core/services/Calendar/calendar.service';
import { finalize } from 'rxjs';
import { CalendarFullSettings, CalendarSettingsComponent } from "../../components/calendar-settings/calendar-settings";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
// import { parseISO } from 'date-fns';


@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, CalendarComponent, CalendarSettingsComponent, TranslateModule],
  templateUrl: './availability-page.html',
  styleUrls: ['./availability-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Availability implements OnInit {

  isLoading = false;
  selectedPropertyId: string | null = null;

  showBlockOptions = false;
  constructor(private cd: ChangeDetectorRef, private calendarService: CalendarService, private translate: TranslateService) { }


  onPropertySelected(propertyId: string) {
    this.selectedPropertyId = propertyId;
    this.loadPropertyCalendarData();
  }


  private loadPropertyCalendarData() {
    if (!this.selectedPropertyId) return;

    this.isLoading = true;
    const today = new Date();
    const endDate = addDays(today, 365);

    this.calendarService.getPropertyCalendar(
      parseInt(this.selectedPropertyId),
      format(today, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd')
    ).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: (calendarData: CalendarDateDTO[]) => {
        this.mapCalendarDataToAvailability(calendarData);
        console.log("calendarData", calendarData)
      },
      error: (error) => {
        this.translate.instant('AVAILABILITY.ERRORS.LOAD_FAILED')
      }
    });
  }

  private mapCalendarDataToAvailability(calendarData: CalendarDateDTO[]) {
    const today = new Date();
    const availability: DayAvailability[] = [];

    const dataMap = new Map<string, CalendarDateDTO>();

    calendarData.forEach(item => {
      // const normalizedKey = format(parseISO(item.date), 'yyyy-MM-dd');
      const normalizedKey = item.date.slice(0, 10);
      dataMap.set(normalizedKey, item);
    });

    for (let i = 0; i < 365; i++) {
      const date = addDays(today, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const backendData = dataMap.get(dateKey);

      if (backendData) {
        availability.push({
          date,
          available: backendData.isAvailable ?? true,
          price: backendData.price ?? 0,
          originalPrice: undefined,
          isBooked: backendData.isBooked ?? false
        });
      } else {
        availability.push({
          date,
          available: true,
          price: 0,
          originalPrice: undefined,
          isBooked: false
        });
      }
    }

    this.calendarSettings = {
      ...this.calendarSettings,
      availability: [...availability]
    };
    this.cd.detectChanges();
  }



  calendarSettings: CalendarSettings = {
    viewType: 'year',
    selectedDates: [],
    availability: [],
    minNights: 1,
    maxNights: 365,
  };

  fullSettings: CalendarFullSettings = {
    pricing: {
      basePrice: 0,
      smartPricingEnabled: false,
      currency: 'USD',
    },
    availability: {
      minNights: 1,
      maxNights: 365,
      advanceNotice: 'same-day',
      sameDayNoticeTime: '12:00',
      preparationTime: 'none',
      availabilityWindow: '12 months in advance',
      checkInDays: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ],
      checkOutDays: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ],
    },
  };

  availabilityMode: 'open' | 'blocked' = 'open';
  selectedDatePrice: number = 0;
  ngOnInit() {

    this.syncCalendarSettings();
  }

  syncCalendarSettings() {
    this.calendarSettings.minNights = this.fullSettings.availability.minNights;
    this.calendarSettings.maxNights = this.fullSettings.availability.maxNights;
  }

  onDateSelected(selectedDates: Date[]) {
    this.calendarSettings.selectedDates = selectedDates;
    this.showBlockOptions = selectedDates.length > 0;

    if (selectedDates.length > 0) {
      const firstDateString = format(selectedDates[0], 'yyyy-MM-dd');
      const availabilityEntry = this.calendarSettings.availability.find(a =>
        format(a.date, 'yyyy-MM-dd') === firstDateString
      );
      this.selectedDatePrice = availabilityEntry?.price ?? this.fullSettings.pricing.basePrice;
    } else {
      this.selectedDatePrice = 0;
    }

    this.cd.markForCheck();
  }

  onCalendarSettingsChanged(settings: CalendarSettings) {
    this.calendarSettings = settings;
    this.cd.markForCheck();
  }

  onFullSettingsChanged(settings: CalendarFullSettings) {
    this.fullSettings = settings;
    this.syncCalendarSettings();
    if (this.selectedPropertyId) {
      this.loadPropertyCalendarData();
    }
    this.cd.markForCheck();
  }

  setAvailabilityMode(mode: 'open' | 'blocked') {
    this.availabilityMode = mode;
    this.cd.markForCheck();
  }

  onPriceChanged(newPrice: number) {
    this.selectedDatePrice = newPrice;
    this.cd.markForCheck();
  }

  clearSelection() {
    this.calendarSettings = {
      ...this.calendarSettings,
      selectedDates: []
    };
    this.showBlockOptions = false;
    this.cd.markForCheck();
  }

  saveChanges() {
    if (this.calendarSettings.selectedDates.length === 0 || !this.selectedPropertyId) return;

    const selectedDates = [...this.calendarSettings.selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const datesToUpdate: CalendarDateDTO[] = [];
    const selectionMode = this.calendarSettings.selectionMode || 'multiple';

    if (selectionMode === 'single') {
      datesToUpdate.push({
        date: format(selectedDates[0], 'yyyy-MM-dd'),
        isAvailable: this.availabilityMode === 'open',
        price: this.selectedDatePrice
      });
    } else if (selectionMode === 'range' && selectedDates.length === 2) {
      let currentDate = new Date(selectedDates[0]);
      while (currentDate <= selectedDates[1]) {
        datesToUpdate.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          isAvailable: this.availabilityMode === 'open',
          price: this.selectedDatePrice
        });
        currentDate = addDays(currentDate, 1);
      }
    } else {
      selectedDates.forEach(d => {
        datesToUpdate.push({
          date: format(d, 'yyyy-MM-dd'),
          isAvailable: this.availabilityMode === 'open',
          price: this.selectedDatePrice
        });
      });
    }

    this.isLoading = true;
    this.cd.markForCheck();

    this.calendarService.updatePropertyCalendar(parseInt(this.selectedPropertyId), datesToUpdate)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (success) => {
          if (success) {
            this.updateLocalAvailability(datesToUpdate);
            this.clearSelection();
          }
        }
      });
  }

  private updateLocalAvailability(updatedDates: CalendarDateDTO[]) {
    const availabilityMap = new Map<string, DayAvailability>();
    this.calendarSettings.availability.forEach(a => availabilityMap.set(format(a.date, 'yyyy-MM-dd'), a));

    updatedDates.forEach(ud => {
      const existing = availabilityMap.get(ud.date);
      if (existing) {
        existing.available = ud.isAvailable ?? true;
        existing.price = ud.price ?? 0;
      } else {
        this.calendarSettings.availability.push({
          date: new Date(ud.date),
          available: ud.isAvailable ?? true,
          price: ud.price ?? 0,
          isBooked: false
        });
      }
    });

    this.calendarSettings = {
      ...this.calendarSettings,
      availability: [...this.calendarSettings.availability]
    };
    this.cd.markForCheck();
  }

}
