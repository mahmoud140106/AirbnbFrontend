import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { LangService } from '../../core/services/lang.service';
import { DialogService } from '../../core/services/dialog.service';
import { TranslateModule } from '@ngx-translate/core';
import { MenuHeader } from "../menu-header/menu-header";

@Component({
  selector: 'app-hostheader',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, MenuHeader],
  templateUrl: './host-header.html',
  styleUrls: ['./host-header.css'],
})
export class HeaderComponent implements OnInit {
  isDarkMode = false;
  dialogService = inject(DialogService);

  constructor(
    public lang: LangService,
    public theme: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void { }

  changeLanguage(lang: string) {
    this.lang.switchLang(lang);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.theme.toggleTheme();
  }

  openLoginDialog() {
    this.dialogService.openDialog('login');
  }

  openRegisterDialog() {
    this.dialogService.openDialog('register');
  }
}
