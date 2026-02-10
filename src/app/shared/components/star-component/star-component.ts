import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar as fasStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-component',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './star-component.html',
  styleUrl: './star-component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StarComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() maxStars: number = 5;
  @Input() starColor: string = 'rgb(232, 65, 89)';
  @Input() inactiveColor: string = '#ccc';
  @Input() fontSize: string = '2rem';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;

  solidStar = fasStar;
  regularStar = farStar;

  @Input() value: number = 0; // Add @Input() decorator to existing value
  hoveredRating: number | null = null;

  stars: number[] = [];

  ngOnInit(): void {
    this.updateStars();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['maxStars']) {
      this.updateStars();
    }
  }

  private updateStars(): void {
    this.stars = Array.from({ length: this.maxStars }, (_, i) => i + 1);
  }

  // ControlValueAccessor implementation

  private onChange = (value: number) => { };
  private onTouched = () => { };

  writeValue(value: number): void {
    this.value = value || 0;
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Star rating logic
  isStarActive(star: number): boolean {
    const current =
      this.hoveredRating !== null ? this.hoveredRating : this.value;
    return star <= current;
  }

  getStarIcon(star: number): IconProp {
    return this.isStarActive(star) ? this.solidStar : this.regularStar;
  }

  onMouseEnter(star: number): void {
    if (!this.disabled && !this.readonly) {
      this.hoveredRating = star;
    }
  }

  onMouseLeave(): void {
    if (!this.disabled && !this.readonly) {
      this.hoveredRating = null;
    }
  }

  selectRating(star: number): void {
    if (!this.disabled && !this.readonly) {
      this.value = star;
      this.onChange(star);
      this.onTouched();
    }
  }
}

// faCoffee = faCoffee;
// faStar = faStar;
// rating: number = 0;
// hovered: any = 0;
// selectedValue: number = this.rating;
// faStarSolid: IconProp = faStar;
// faStarRegular: IconProp = faStar;
