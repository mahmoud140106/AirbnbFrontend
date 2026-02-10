import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService, SearchParams } from '../../core/services/Property/property.service';
import { Property } from '../../core/models/Property';
import * as L from 'leaflet';
import { SliderCard } from '../home/components/slider-card/slider-card';
import { environment } from '../../../environments/environment.development';
import { debounceTime, Observable, Subject } from 'rxjs';
import { WishlistService } from '../../core/services/Wishlist/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WishListModal } from "../../components/wish-list-modal/wish-list-modal";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-filtered-properties',
  standalone: true,
  imports: [CommonModule, SliderCard, RouterModule, WishListModal, TranslateModule],
  templateUrl: './filtered-properties.html',
  styleUrls: ['./filtered-properties.css']
})
export class FilteredProperties implements OnInit {

  selectedPropertyId!: number;
  show = false;

  onPropertyClick(id: number) {
    this.router.navigate(['/property', id])
  }

  onWishlistClick(id: number) {
    if (!this.authService.userId) {
      this.showToast('Please log in to manage wishlist.', 'top', 'right');
      this.dialogService.openDialog('login');
      return;
    }
    const foundProperty = this.properties.find(p => p.id === id);
    if (foundProperty?.isFavourite) {
      this.removeFromWishlist(id);
    } else {
      this.selectedPropertyId = id;
      this.show = true;
    }
  }


  removeFromWishlist(propertyId: number) {
    this.wishlistService.removePropertyFromWishlist(propertyId).subscribe({
      next: (success) => {
        if (success) {
          const property = this.properties.find(p => p.id === propertyId);
          if (property) {
            property.isFavourite = false;
            this.updateMapMarkers();
          }

          this.showToast('Property removed from wishlist', 'bottom', 'left');
        } else {
          this.showToast("Couldn't remove the property", 'bottom', 'left');
        }
      },
      error: (err) => {
        console.error('Error removing property:', err);
        this.showToast("Couldn't remove the property", 'bottom', 'left');
      }
    });
  }


  onFinish(observable: Observable<boolean>) {
    this.onClose();

    observable.subscribe({
      next: (success) => {
        if (success) {
          const property = this.properties.find(p => p.id === this.selectedPropertyId);
          if (property) {
            property.isFavourite = true;
            this.updateMapMarkers();
          }

          this.showToast('Property added to wishlist', 'bottom', 'left');
        } else {
          this.showToast("Couldn't add the property", 'bottom', 'left');
        }
      },
      error: () => {
        this.showToast("Couldn't add the property", 'bottom', 'left');
      }
    });
  }


  private showToast(message: string, vertical: 'top' | 'bottom', horizontal: 'left' | 'right') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: horizontal,
      verticalPosition: vertical,
      panelClass: ['custom-snackbar']
    });
  }

  onClose() {
    this.show = false
  }

  private isFirstLoad = true;
  isInitialLoading = true;
  isLoading = false;
  isMapLoading = false;
  properties: Property[] = [];
  selectedProperty: Property | null = null;
  selectedMarker: L.Marker | null = null;

  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageSize = 12;

  map: L.Map | null = null;
  markers: L.Marker[] = [];
  private searchParams: SearchParams = {} as any;

  // Subject for debouncing map changes
  private mapChangeSubject = new Subject<{ lat: number, lng: number, zoom: number }>();
  private isMapInitialized = false;
  private shouldFitBounds = true;
  private isUserInteraction = false;
  private isSelectingFromUI = false;

  private lastSearchCenter: L.LatLng | null = null;
  private lastSearchZoom: number | null = null;
  private readonly MOVEMENT_THRESHOLD = 500; // 500 meters
  private readonly ZOOM_THRESHOLD = 0.5; // zoom level change

  constructor(
    private route: ActivatedRoute,
    private propertyService: PropertyService,
    private wishlistService: WishlistService,
    private router: Router,
    public authService: AuthService,
    private dialogService: DialogService,
    private snackBar: MatSnackBar,

  ) {
    // Setup debounced map change handler
    this.mapChangeSubject.pipe(
      debounceTime(1500)
    ).subscribe(({ lat, lng, zoom }) => {
      this.handleMapChange(lat, lng, zoom);
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Only show initial loading shimmers on the very first time we have no data
      if (this.properties.length === 0 && this.isInitialLoading) {
        this.isInitialLoading = true;
      } else {
        this.isInitialLoading = false;
      }

      const searchParams: SearchParams = {};

      if (params['country']) {
        searchParams.country = params['country'];
      }

      const lat = Number(params['latitude']);
      if (!isNaN(lat)) {
        searchParams.latitude = lat;
      }

      const lng = Number(params['longitude']);
      if (!isNaN(lng)) {
        searchParams.longitude = lng;
      }

      const guests = Number(params['guestsCount']);
      if (!isNaN(guests)) {
        searchParams.guestsCount = guests;
      }

      if (params['startDate']) {
        searchParams.startDate = params['startDate'];
      }

      if (params['endDate']) {
        searchParams.endDate = params['endDate'];
      }

      const page = Number(params['page']);
      searchParams.page = !isNaN(page) ? page : 1;

      const pageSize = Number(params['pageSize']);
      searchParams.pageSize = !isNaN(pageSize) ? pageSize : 10;

      const zoom = Number(params['zoom']);
      if (!isNaN(zoom)) {
        // searchParams.maxDistanceKm = this.calculateDistanceFromZoom(zoom);
        searchParams.maxDistanceKm = 100;
      } else {
        searchParams.maxDistanceKm = 100;
      }

      this.searchParams = searchParams;
      this.currentPage = searchParams.page!;
      this.pageSize = searchParams.pageSize!;

      this.shouldFitBounds = !this.isMapInitialized;
      this.loadProperties();

      this.isFirstLoad = false;

    });
  }

  loadProperties() {
    this.isLoading = true;

    if (!this.isFirstLoad && this.searchParams.country) {
      delete this.searchParams.country;
    }
    this.propertyService.searchProperties(this.searchParams).subscribe({
      next: response => {
        if (response.isSuccess) {
          this.isLoading = false;
          this.isInitialLoading = false;
          this.isMapLoading = false;

          const newItems = response.data.items || [];

          if (newItems.length > 0) {
            this.properties = newItems;
            this.totalItems = response.data.metaData.total;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            this.currentPage = response.data.metaData.page;
            this.pageSize = response.data.metaData.pageSize;
          } else if (this.properties.length === 0) {
            // Only set to empty if we didn't have anything before
            this.properties = [];
            this.totalItems = 0;
            this.totalPages = 0;
          } else {
            // Keep previous properties as requested by the user
            console.log('📍 No results found in this area, retaining previous properties.');
            this.showToast('No properties found in this area, showing previous results.', 'bottom', 'center' as any);
          }

          if (!this.map) {
            this.isLoading = false;

            this.initializeLeafletMap();
          }
          else {
            this.isLoading = false;

            this.updateMapMarkers();
          }
        }
      },
      error: err => {
        console.error('❌ API Error:', err);
        this.isLoading = false;
        this.isInitialLoading = false;
        this.isMapLoading = false;
      }
    });
  }

  trackByPropertyId(_i: number, p: Property) {
    return p.id;
  }

  selectProperty(property: Property) {
    this.isSelectingFromUI = true;
    this.selectedProperty = property;

    // const targetMarker = this.markers.find(marker => {
    //   const latLng = marker.getLatLng();
    //   return latLng.lat === property.latitude && latLng.lng === property.longitude;
    // });

    const targetMarker = this.markers.find(marker => {
      return (marker as any).propertyId === property.id;
    });

    if (this.map && targetMarker) {
      this.updateSelectedMarker(targetMarker);

      // this.map.flyTo([property.latitude, property.longitude], 15, {
      //   animate: true,
      //   duration: 1.5,
      //   easeLinearity: 0.25
      // });

      // setTimeout(() => {
      targetMarker.openPopup();
      // }, 1000);

      setTimeout(() => {
        this.isSelectingFromUI = false;
      }, 100);
    }
  }

  private updateSelectedMarker(newSelectedMarker: L.Marker) {
    if (this.selectedMarker) {
      const prevProperty = this.getPropertyByMarker(this.selectedMarker);
      if (prevProperty) {
        const normalIcon = this.createCustomMarkerIcon(prevProperty.pricePerNight, false);
        this.selectedMarker.setIcon(normalIcon);
      }
    }

    this.selectedMarker = newSelectedMarker;
    const selectedProperty = this.getPropertyByMarker(newSelectedMarker);
    if (selectedProperty) {
      const selectedIcon = this.createCustomMarkerIcon(selectedProperty.pricePerNight, true);
      newSelectedMarker.setIcon(selectedIcon);
    }
  }

  private getPropertyByMarker(marker: L.Marker): Property | undefined {
    const propertyId = (marker as any).propertyId;
    return this.properties.find(p => p.id === propertyId);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.searchParams.page = page;
    this.updateUrlParams();
    this.loadProperties();
    document.querySelector('.properties-panel')?.scrollTo(0, 0);
  }

  getVisiblePages(): (number | string)[] {
    const delta = 2;
    const range: (number | string)[] = [];
    const pages: (number | string)[] = [];

    for (let i = Math.max(2, this.currentPage - delta);
      i <= Math.min(this.totalPages - 1, this.currentPage + delta); i++) {
      range.push(i);
    }

    if (this.currentPage - delta > 2) pages.push(1, '...');
    else pages.push(1);

    pages.push(...range);

    if (this.currentPage + delta < this.totalPages - 1) pages.push('...', this.totalPages);
    else if (this.totalPages > 1) pages.push(this.totalPages);

    return pages.filter((v, i, a) => i === 0 || v !== a[i - 1]);
  }

  private createCustomMarkerIcon(price: number, isSelected: boolean = false): L.DivIcon {
    const bgColor = isSelected ? '#ff385c' : 'var(--bg-color)';
    const textColor = isSelected ? '#ffffff' : 'var(--primary-text-color)';
    const borderColor = isSelected ? '#ff385c' : 'var(--bg-color)';
    const scale = isSelected ? 'scale(1)' : 'scale(1)';

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${bgColor} !important;
          color: ${textColor};
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          border: 2px solid ${borderColor} !important;
          position: relative;
          transform: ${scale};
          transition: all 0.3s ease;
          box-shadow: ${isSelected ? '0 4px 12px rgba(255, 56, 92, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)'};
        ">
          ${price}
          <div style="
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 10px solid ${borderColor};
          "></div>
        </div>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 40]
    });
  }

  private initializeLeafletMap() {
    const lat = this.searchParams.latitude || 25.7617;
    const lng = this.searchParams.longitude || -80.1918;

    this.map = L.map('leaflet-map', {
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomAnimationThreshold: 4
    }).setView([lat, lng], 13);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map!);

    // Add event listeners for map changes
    this.setupMapEventListeners();
    this.updateMapMarkers();

    this.properties.forEach(p => {
      const customIcon = this.createCustomMarkerIcon(p.pricePerNight);

      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon })
        .addTo(this.map!)
        .bindPopup(
          `
        <div class="popup-card" style="width: 200px; cursor: pointer;" data-property-id="${p.id
          }">
      <div class="image-container position-relative">
        <img src="${this.getPropertyImage(p)}"
             alt="listing image"
             class="img-fluid rounded-4"
             style="width: 100%; height: 120px; object-fit: cover;">

        <button
          class="wishlist-btn bi text-success position-absolute top-0 end-0 m-2"
          data-wishlist-id="${p.id}"
        >
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            role="presentation"
            focusable="false"
            style="display: block; height: 24px; width: 24px; stroke: white !important; stroke-width: 2; overflow: visible;"
          >
            <path
              d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"
              fill="${p.isFavourite ? '#ff385c' : 'rgba(0, 0, 0, 0.5)'}"
            ></path>
          </svg>
        </button>
      </div>

      <div class="info px-2 pt-2 pb-3">
        <div class="title fw-semibold" style="font-size: 12px;">${p.title}</div>
        <div class="subtitle small" style="font-size: 10px;">${this.getLocationSubtitle(
            p
          )}</div>

        <div class="d-flex justify-content-between align-items-center mt-1 flex-row-reverse">
          <div class="rating small d-flex align-items-center" style="font-size: 10px;">
            <i class="bi bi-star-fill text-warning me-1"></i>${p.averageRating}
          </div>
          <div class="price" style="font-size: 10px;">
            $${p.pricePerNight} <span class="small">for 5 nights</span>
          </div>
        </div>
      </div>
    </div>
        `
        )
        .on('click', () => {
          this.selectProperty(p);
          this.updateSelectedMarker(marker);
        }).on('popupopen', () => {
          const cardEl = document.querySelector(`.popup-card[data-property-id="${p.id}"]`);
          if (cardEl) {
            cardEl.addEventListener('click', (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('.wishlist-btn')) return;
              this.onPropertyClick(p.id);
            });
          }

          const wishlistBtn = document.querySelector(`.wishlist-btn[data-wishlist-id="${p.id}"]`);
          if (wishlistBtn) {
            wishlistBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              this.onWishlistClick(p.id);
            });
          }
        });

      this.markers.push(marker);
    });

















    // Only fit bounds if it's initial load or specifically requested
    if (this.markers.length && this.shouldFitBounds && !this.isUserInteraction) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    // Mark map as initialized after a short delay
    setTimeout(() => {
      this.isMapInitialized = true;
      this.isUserInteraction = false;
      console.log('🗺️ Map initialized and ready for change detection');
    }, 2000);
  }

  private updateMapMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    this.selectedMarker = null;

    this.properties.forEach(p => {
      const isSelected = this.selectedProperty?.id === p.id;
      const customIcon = this.createCustomMarkerIcon(p.pricePerNight, isSelected);
      const marker = L.marker([p.latitude, p.longitude], { icon: customIcon })
        .addTo(this.map!)
        .bindPopup(`
      <div class="popup-card" style="width: 200px; cursor: pointer; background:var(--bg-color) !important" data-property-id="${p.id
          }">
      <div class="image-container position-relative">
        <img src="${this.getPropertyImage(p)}"
             alt="listing image"
             class="img-fluid rounded-4"
             style="width: 100%; height: 120px; object-fit: cover;">

        <button
          class="wishlist-btn bi text-success position-absolute top-0 end-0 m-2"
          data-wishlist-id="${p.id}"
        >
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            role="presentation"
            focusable="false"
            style="display: block; height: 24px; width: 24px; stroke: white !important; stroke-width: 2; overflow: visible;"
          >
            <path
              d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"
              fill="${p.isFavourite ? '#ff385c' : 'rgba(0, 0, 0, 0.5)'}"
            ></path>
          </svg>
        </button>
      </div>

      <div class="info px-2 pt-2 pb-3">
        <div class="title fw-semibold" style="font-size: 12px;">${p.title}</div>
        <div class="subtitle small" style="font-size: 10px;">${this.getLocationSubtitle(
            p
          )}</div>

        <div class="d-flex justify-content-between align-items-center mt-1 flex-row-reverse">
          <div class="rating small d-flex align-items-center" style="font-size: 10px;">
            <i class="bi bi-star-fill text-warning me-1"></i>${p.averageRating}
          </div>
          <div class="price" style="font-size: 10px;">
            $${p.pricePerNight} <span class="small">for 5 nights</span>
          </div>
        </div>
      </div>
    </div>
        `)
        .on('click', () => {
          this.selectProperty(p);
          this.updateSelectedMarker(marker);
        }).on('popupopen', () => {
          const cardEl = document.querySelector(`.popup-card[data-property-id="${p.id}"]`);
          if (cardEl) {
            cardEl.addEventListener('click', (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('.wishlist-btn')) return;
              this.onPropertyClick(p.id);
            });
          }

          const wishlistBtn = document.querySelector(`.wishlist-btn[data-wishlist-id="${p.id}"]`);
          if (wishlistBtn) {
            wishlistBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              this.onWishlistClick(p.id);
            });
          }
        });
      (marker as any).propertyId = p.id;

      this.markers.push(marker);

      if (isSelected) {
        this.selectedMarker = marker;
        setTimeout(() => {
          marker.openPopup();
        }, 500);
      }
    });

    if (this.markers.length && this.shouldFitBounds && !this.isUserInteraction) {
      const group = L.featureGroup(this.markers);
      this.map!.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  private setupMapEventListeners() {
    if (!this.map) return;

    const updateMapInfo = () => {
      if (!this.isMapInitialized) return;

      const center = this.map!.getCenter();
      const zoom = this.map!.getZoom();

      this.mapChangeSubject.next({
        lat: center.lat,
        lng: center.lng,
        zoom: zoom
      });
    };

    this.map.on('movestart', () => {
      if (this.isMapInitialized && !this.isSelectingFromUI) {
        this.isUserInteraction = true;
        this.shouldFitBounds = false;
        this.isMapLoading = true;
      }
    });

    this.map.on('moveend', () => {
      if (!this.isSelectingFromUI) {
        // this.isMapLoading = false;
      }
      updateMapInfo();
    });

    this.map.on('zoomstart', () => {
      if (this.isMapInitialized && !this.isSelectingFromUI) {
        this.isUserInteraction = true;
        this.shouldFitBounds = false;
        this.isMapLoading = true;
      }
    });

    this.map.on('zoomend', () => {
      if (!this.isSelectingFromUI) {
        // this.isMapLoading = false;
      }
      updateMapInfo();
    });
  }

  private async handleMapChange(lat: number, lng: number, zoom: number) {
    if (this.isSelectingFromUI || !this.map) {
      return;
    }

    const currentCenter = L.latLng(lat, lng);

    // Check if movement is significant
    if (this.lastSearchCenter) {
      const distance = currentCenter.distanceTo(this.lastSearchCenter);
      const zoomDiff = Math.abs(zoom - (this.lastSearchZoom || 0));

      if (distance < this.MOVEMENT_THRESHOLD && zoomDiff < this.ZOOM_THRESHOLD) {
        console.log('📍 Movement/Zoom below threshold, skipping update', { distance, zoomDiff });
        this.isMapLoading = false;
        return;
      }
    }

    console.log('🔄 Significant Map change detected:', {
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      zoom,
      distance: this.lastSearchCenter ? currentCenter.distanceTo(this.lastSearchCenter).toFixed(0) + 'm' : 'initial'
    });

    this.lastSearchCenter = currentCenter;
    this.lastSearchZoom = zoom;
    this.isMapLoading = true;

    // Update search parameters with new location and distance
    this.searchParams.latitude = lat;
    this.searchParams.longitude = lng;
    this.searchParams.maxDistanceKm = 100;
    this.searchParams.page = 1;
    this.currentPage = 1;

    // Update URL parameters
    this.updateUrlParams(zoom);

    // Load new properties
    this.loadProperties();
  }

  // private async getCountryFromCoordinates(lat: number, lng: number): Promise<string | null> {
  //   try {
  //     const response = await fetch(
  //       `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`
  //     );

  //     if (!response.ok) {
  //       throw new Error('Geocoding request failed');
  //     }

  //     const data = await response.json();

  //     const country =
  //       data?.name ||
  //       data.address?.country ||
  //       data.display_name?.split(',').pop()?.trim() || data?.address?.country_code;

  //     return country || null;
  //   } catch (error) {
  //     console.error('❌ Error in reverse geocoding:', error);
  //     return null;
  //   }
  // }

  private calculateDistanceFromZoom(zoom: number): number {

    if (zoom >= 16) return 1;
    if (zoom >= 14) return 3;
    if (zoom >= 12) return 8;
    if (zoom >= 10) return 20;
    if (zoom >= 8) return 50;
    if (zoom >= 6) return 100;
    if (zoom >= 4) return 300;
    return 500;
  }

  private updateUrlParams(zoom?: number) {
    const queryParams: any = {
      ...this.route.snapshot.queryParams,
      latitude: this.searchParams.latitude?.toFixed(6),
      longitude: this.searchParams.longitude?.toFixed(6),
      page: this.searchParams.page,
      pageSize: this.searchParams.pageSize,
      maxDistanceKm: this.searchParams.maxDistanceKm
    };

    // if (this.searchParams.country) {
    //   queryParams.country = this.searchParams.country;
    // }

    if (zoom !== undefined) {
      queryParams.zoom = zoom;
    }

    if (this.searchParams.guestsCount) {
      queryParams.guestsCount = this.searchParams.guestsCount;
    }

    if (this.searchParams.startDate) {
      queryParams.startDate = this.searchParams.startDate;
    }

    if (this.searchParams.endDate) {
      queryParams.endDate = this.searchParams.endDate;
    }

    console.log('🔗 Updating URL params:', queryParams);

    // Navigate with new parameters without refreshing the page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      replaceUrl: true
    });
  }

  getPropertyImage(property: Property): string {
    const cover = property.images?.find(img => img.isCover && !img.isDeleted);

    if (cover?.imageUrl) {
      return `${environment.base}${cover.imageUrl}`;
    }

    // fallback image
    return 'assets/images/deafult.png';
  }


  getLocationSubtitle(property: Property): string {
    return `${property.city}, ${property.state}`;
  }
}
