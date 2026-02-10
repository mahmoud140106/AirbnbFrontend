import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ChatService,
  ChatSessionDto,
  MessageDto,
  nllb_languages,
} from '../../core/services/Message/message.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { SignalRService } from '../../core/services/SignalRService/signal-rservice';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

interface Language {
  code: string;
  name: string;
}

interface MessageThread {
  id: string;
  profileImage: string;
  name: string;
  preview: string;
  time: string;
  tripDetails?: string;
  isUnread?: boolean;
  unreadCount?: number;
  propertyId: number;
  hostId: string;
  userId: string;
  originalSession: ChatSessionDto;
}

@Component({
  selector: 'app-messages-box',
  templateUrl: './messages-box.html',
  styleUrls: ['./messages-box.css'],
  imports: [CommonModule, FormsModule, TranslateModule],
  standalone: true
})
export class MessagesBoxComponent implements OnInit, OnDestroy {
  @Output() chatSessionSelected = new EventEmitter<ChatSessionDto>();
  @Output() langChange = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messageThreads: MessageThread[] = [];
  selectedThreadId: string | null = null;
  activeFilter: 'all' | 'unread' = 'all';

  // Language settings
  showLanguageSettings = false;
  selectedLanguage = localStorage.getItem('chatLanguage') || '';
  searchQuery = '';
  languages: Language[] = Object.entries(nllb_languages).map(([name, code]) => ({
    name,
    code: name // We use the full name as the code since our service handles the mapping
  }));

  // Filtered languages based on search
  get filteredLanguages(): Language[] {
    if (!this.searchQuery) return this.languages;
    const query = this.searchQuery.toLowerCase();
    return this.languages.filter(lang =>
      lang.name.toLowerCase().includes(query)
    );
  }

  // Pagination and loading states
  currentPage = 1;
  pageSize = 20;
  hasMoreData = true;
  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private scrollDebounceTime = 200; // ms

  // Scroll handling
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (
      element.scrollHeight - element.scrollTop <= element.clientHeight * 1.5 &&
      !this.isLoadingMore &&
      this.hasMoreData
    ) {
      this.loadMoreMessages();
    }
  }

  // Track by function for better performance
  trackByThreadId(index: number, thread: MessageThread): string {
    return thread.id;
  }

  // Load more messages manually (for testing)
  loadMoreManually(): void {
    if (!this.isLoadingMore && this.hasMoreData) {
      this.loadMoreMessages();
    }
  }

  // Load more messages
  loadMoreMessages(): void {
    if (!this.hasMoreData || this.isLoadingMore) return;
    this.isLoadingMore = true;
    this.loadChatSessions();
  }

  constructor(
    private chatService: ChatService,
    private signalRService: SignalRService,

    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadChatSessions();
    this.setupSignalRHandlers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleLanguageSettings(): void {
    this.showLanguageSettings = !this.showLanguageSettings;
  }

  onLanguageChange(): void {
    // Update the language in the service and reload messages
    if (this.selectedLanguage || this.selectedLanguage == "" || this.selectedLanguage == null) {
      console.log("selected language", this.selectedLanguage)
      this.chatService.updateTargetLanguage(this.selectedLanguage);
      this.resetAndLoadChatSessions();
      this.langChange.emit()
    }
  }

  // Your existing methods...

  setActiveFilter(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
    this.resetAndLoadChatSessions();
  }

  openMessage(thread: MessageThread): void {
    this.selectedThreadId = thread.id;
    this.chatSessionSelected.emit(thread.originalSession);
  }

  getFilteredMessages(): MessageThread[] {
    if (this.activeFilter === 'unread') {
      return this.messageThreads.filter((thread) => thread.isUnread);
    }
    return this.messageThreads;
  }

  getUnreadMessages(): MessageThread[] {
    return this.messageThreads.filter((thread) => thread.isUnread);
  }

  getUnreadCount(): number {
    return this.getUnreadMessages().length;
  }

  // Check if thread is selected
  isThreadSelected(threadId: string): boolean {
    return this.selectedThreadId === threadId;
  }

  // Method to refresh chat sessions
  refreshChatSessions(): void {
    this.resetAndLoadChatSessions();
  }

  private setupSignalRHandlers(): void {
    this.signalRService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        console.log("messageRecived", response)
        this.refreshChatSessions();
      });
  }

  private loadChatSessions(): void {
    if (!this.hasMoreData || this.isLoading) return;

    this.isLoading = true;
    this.error = null;

    this.chatService
      .getChatSessions(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          const newThreads = this.mapSessionsToThreads(sessions);
          this.messageThreads = [...this.messageThreads, ...newThreads];

          const unreadCount = this.messageThreads.filter(t => t.isUnread).length;
          this.chatService.updateUnreadCount(unreadCount);

          this.hasMoreData = sessions.length === this.pageSize;
          this.currentPage++;
          this.isLoading = false;
          this.isLoadingMore = false;
          this.cdr.detectChanges();

        },
        error: (error) => {
          console.error('Error loading chat sessions:', error);
          this.error = 'Failed to load messages. Please try again.';
          this.isLoading = false;
          this.isLoadingMore = false;
          this.cdr.detectChanges();

        },
      });
  }

  resetAndLoadChatSessions(): void {
    this.messageThreads = [];
    this.currentPage = 1;
    this.hasMoreData = true;
    this.loadChatSessions();

  }

  private mapSessionsToThreads(sessions: ChatSessionDto[]): MessageThread[] {
    return sessions.map((session) => ({
      id: session.id,
      profileImage: session.hostId === this.authService.userId ?
        session.userAvatarUrl : session.hostAvatarUrl,
      name: session.hostId === this.authService.userId ?
        session.userName : session.hostName,
      preview: session.lastMessageText,
      time: this.formatTime(session.lastActivityAt),
      isUnread: session.unreadCount > 0,
      unreadCount: session.unreadCount,
      propertyId: session.propertyId,
      hostId: session.hostId,
      userId: session.userId,
      originalSession: session
    }));
  }

  private formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
}
