import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';

// Language mapping for API
export const nllb_languages: { [key: string]: string } = {
  "Afrikaans": "afr_Latn",
  "Akan": "aka_Latn",
  "Amharic": "amh_Ethi",
  "Arabic": "arb_Arab",
  "Assamese": "asm_Beng",
  "Asturian": "ast_Latn",
  "Awadhi": "awa_Deva",
  "Aymara": "ayr_Latn",
  "Azerbaijani": "azj_Latn",
  "Bambara": "bam_Latn",
  "Bashkir": "bak_Cyrl",
  "Basque": "eus_Latn",
  "Belarusian": "bel_Cyrl",
  "Bemba": "bem_Latn",
  "Bengali": "ben_Beng",
  "Bhojpuri": "bho_Deva",
  "Bosnian": "bos_Latn",
  "Bulgarian": "bul_Cyrl",
  "Catalan": "cat_Latn",
  "Cebuano": "ceb_Latn",
  "Central Kurdish": "ckb_Arab",
  "Chokwe": "cjk_Latn",
  "Czech": "ces_Latn",
  "Chinese (Simplified)": "zho_Hans",
  "Chinese (Traditional)": "zho_Hant",
  "Chuvash": "chv_Cyrl",
  "Cornish": "cor_Latn",
  "Croatian": "hrv_Latn",
  "Danish": "dan_Latn",
  "Dutch": "nld_Latn",
  "Dzongkha": "dzo_Tibt",
  "English": "eng_Latn",
  "Esperanto": "epo_Latn",
  "Estonian": "est_Latn",
  "Ewe": "ewe_Latn",
  "Faroese": "fao_Latn",
  "Fijian": "fij_Latn",
  "Finnish": "fin_Latn",
  "French": "fra_Latn",
  "Friulian": "fur_Latn",
  "Galician": "glg_Latn",
  "Ganda": "lug_Latn",
  "Georgian": "kat_Geor",
  "German": "deu_Latn",
  "Greek": "ell_Grek",
  "Guarani": "grn_Latn",
  "Gujarati": "guj_Gujr",
  "Haitian Creole": "hat_Latn",
  "Hausa": "hau_Latn",
  "Hebrew": "heb_Hebr",
  "Hindi": "hin_Deva",
  "Hungarian": "hun_Latn",
  "Icelandic": "isl_Latn",
  "Igbo": "ibo_Latn",
  "Ilocano": "ilo_Latn",
  "Indonesian": "ind_Latn",
  "Irish": "gle_Latn",
  "Italian": "ita_Latn",
  "Japanese": "jpn_Jpan",
  "Javanese": "jav_Latn",
  "Kabyle": "kab_Latn",
  "Kannada": "kan_Knda",
  "Kashmiri": "kas_Arab",
  "Kazakh": "kaz_Cyrl",
  "Khmer": "khm_Khmr",
  "Kikuyu": "kik_Latn",
  "Kinyarwanda": "kin_Latn",
  "Komi": "kom_Cyrl",
  "Kongo": "kon_Latn",
  "Korean": "kor_Hang",
  "Kurdish": "kur_Arab",
  "Kyrgyz": "kir_Cyrl",
  "Lao": "lao_Laoo",
  "Latvian": "lvs_Latn",
  "Lingala": "lin_Latn",
  "Lithuanian": "lit_Latn",
  "Luba-Katanga": "lub_Latn",
  "Luxembourgish": "ltz_Latn",
  "Macedonian": "mkd_Cyrl",
  "Magahi": "mag_Deva",
  "Maithili": "mai_Deva",
  "Malagasy": "plt_Latn",
  "Malay": "zsm_Latn",
  "Malayalam": "mal_Mlym",
  "Maltese": "mlt_Latn",
  "Manipuri": "mni_Beng",
  "Maori": "mri_Latn",
  "Marathi": "mar_Deva",
  "Meitei": "mni_Mtei",
  "Mongolian": "khk_Cyrl",
  "Montenegrin": "cnr_Latn",
  "Nepali": "npi_Deva",
  "Northern Sotho": "nso_Latn",
  "Norwegian": "nob_Latn",
  "Nyanja": "nya_Latn",
  "Occitan": "oci_Latn",
  "Odia": "ory_Orya",
  "Oromo": "orm_Latn",
  "Pashto": "pus_Arab",
  "Persian": "pes_Arab",
  "Polish": "pol_Latn",
  "Portuguese": "por_Latn",
  "Punjabi": "pan_Guru",
  "Quechua": "quy_Latn",
  "Romanian": "ron_Latn",
  "Russian": "rus_Cyrl",
  "Samoan": "smo_Latn",
  "Sanskrit": "san_Deva",
  "Sardinian": "srd_Latn",
  "Scots Gaelic": "gla_Latn",
  "Serbian": "srp_Cyrl",
  "Shona": "sna_Latn",
  "Sindhi": "snd_Arab",
  "Sinhala": "sin_Sinh",
  "Slovak": "slk_Latn",
  "Slovenian": "slv_Latn",
  "Somali": "som_Latn",
  "Southern Sotho": "sot_Latn",
  "Spanish": "spa_Latn",
  "Sundanese": "sun_Latn",
  "Swahili": "swh_Latn",
  "Swedish": "swe_Latn",
  "Tajik": "tgk_Cyrl",
  "Tamil": "tam_Taml",
  "Tatar": "tat_Cyrl",
  "Telugu": "tel_Telu",
  "Thai": "tha_Thai",
  "Tigrinya": "tir_Ethi",
  "Tongan": "ton_Latn",
  "Turkish": "tur_Latn",
  "Turkmen": "tuk_Latn",
  "Twi": "twi_Latn",
  "Ukrainian": "ukr_Cyrl",
  "Urdu": "urd_Arab",
  "Uyghur": "uig_Arab",
  "Uzbek": "uzn_Latn",
  "Vietnamese": "vie_Latn",
  "Welsh": "cym_Latn",
  "Western Frisian": "fry_Latn",
  "Wolof": "wol_Latn",
  "Xhosa": "xho_Latn",
  "Yoruba": "yor_Latn",
  "Zulu": "zul_Latn"
};
import { BehaviorSubject, Observable, Subject, map, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Property } from '../../models/Property';

export interface Result<T> {
  data: T;
  isSuccess: boolean;
  message: string;
  statusCode: number;
}

export interface ChatSessionDto {
  id: string;
  propertyId: number;
  propertyTitle: string;
  propertyImageUrl: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string;
  lastActivityAt: string;
  lastMessageText: string;
  unreadCount: number;
  hasPendingRequests: boolean;
  isActive: boolean;
  isHost: boolean
}

export interface ReactionUser {
  id: string;
  userName: string;
  avatarUrl: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  reactionType: number;
  users: ReactionUser[];
  count: number;
  hasCurrentUserReacted: boolean;
}

export interface ReservationRequest {
  id: string;
  chatSessionId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  requestStatus: number;
  requestedAt: string;
  respondedAt: string | null;
  responseMessage: string | null;
  nightCount: number;
  pricePerNight: number;
}

export interface MessageDto {
  id: string;
  chatSessionId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  messageText: string;
  messageType: string;
  createdAt: string;
  isEdited: boolean;
  editedAt: string | null;
  isHost: boolean;
  isOwnMessage: boolean;
  isRead: boolean;
  reactions: MessageReaction[];
  reservationRequest: ReservationRequest | null;
}

export interface SendMessageRequest {
  chatSessionId: string;
  messageText: string;
  messageType: number;
}

export interface ReservePropertyRequest {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  message: string;
}
export interface ReserveRequestIntProeprtyId {
  propertyId: number;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  message: string;
}

export interface User {
  userId: string | null;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  bio: string;
  birthDate: string;
  country: string;
  profilePictureURL: string;
}

export interface PropertyImage {
  id: number;
  groupName: string;
  propertyId: number;
  imageUrl: string;
  isCover: boolean;
  isDeleted: boolean;
}

export interface ReservationRequestWithUser extends ReservationRequest {
  userId: string;
  user: User;
}

export interface ReservePropertyResponse {
  latestReservationRequest: ReservationRequestWithUser;
  chatSession: ChatSessionDto;
  proeprty: Property;
  messages: MessageDto[];
}

function getLanguageParams(): HttpParams {
  // Convert language name to NLLB code, fallback to English if not found
  if (targetLang == null || targetLang == "" || targetLang == "null")
    return new HttpParams()
  const apiLangCode = nllb_languages[targetLang] || nllb_languages['English'];
  return new HttpParams().set('targetLang', apiLangCode);
}

// We'll keep a simple mapping for common language codes to full names
const languageMapping: { [key: string]: string } = {
  'ar': 'Arabic',
  'en': 'English',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ru': 'Russian',
  'zh': 'Chinese (Simplified)'
};

// Get initial language from localStorage or use default
let targetLang: string = localStorage.getItem('chatLanguage') || 'Arabic';
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly baseUrl = environment.baseUrl + '/chat';
  private messageCache = new Map<string, MessageDto[]>();
  private readonly CACHE_EXPIRY = 10 * 60 * 1000; // 5 minutes

  public _targetLang$ = new BehaviorSubject<string>("")
  public targetLang$ = this._targetLang$.asObservable()

  constructor(private http: HttpClient) { }

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private messagesReadSubject = new Subject<string>();
  public messagesRead$ = this.messagesReadSubject.asObservable();

  public updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  // Get user chat sessions with pagination
  getChatSessions(page: number = 1, pageSize: number = 20): Observable<ChatSessionDto[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<ChatSessionDto[]>(`${this.baseUrl}/sessions`, { params });
  }

  // Create or get existing chat session for a property
  createOrGetChatSession(propertyId: number): Observable<Result<ChatSessionDto>> {
    return this.http.post<Result<ChatSessionDto>>(`${this.baseUrl}/sessions`, propertyId);
  }

  // Get messages for a specific chat session with pagination
  getChatMessages(
    chatSessionId: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<MessageDto[]> {
    const cacheKey = `${chatSessionId}-${page}-${pageSize}-${targetLang}`;
    const cachedData = this.messageCache.get(cacheKey);

    if (cachedData) {
      return of(cachedData);
    }

    const params = getLanguageParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<MessageDto[]>(`${this.baseUrl}/sessions/${chatSessionId}/messages`, { params })
      .pipe(
        tap(messages => {
          this.messageCache.set(cacheKey, messages);
          // Clear cache after expiry
          setTimeout(() => this.messageCache.delete(cacheKey), this.CACHE_EXPIRY);
        })
      );
  }

  // Send a message in a chat session
  sendMessage(chatSessionId: string, messageText: string, messageType: number = 1, isUser: boolean = true): Observable<MessageDto> {
    const request: SendMessageRequest = {
      chatSessionId,
      messageText,
      messageType
    };

    const params = new HttpParams().set('isUser', isUser.toString());

    return this.http
      .post<MessageDto>(`${this.baseUrl}/sessions/${chatSessionId}/messages`, request, { params });
  }

  // Mark messages as read in a chat session
  markMessagesAsRead(chatSessionId: string, isUser: boolean = true): Observable<{ message: string }> {
    const params = new HttpParams().set('isUser', isUser.toString());
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/sessions/${chatSessionId}/mark-read`, {}, { params })
      .pipe(
        tap(() => {
          this.messagesReadSubject.next(chatSessionId);
        })
      );
  }

  // Reserve a property (creates chat session and reservation request)
  reserveProperty(request: ReservePropertyRequest): Observable<Result<ReservePropertyResponse>> {
    const params = getLanguageParams();
    return this.http.post<Result<ReservePropertyResponse>>(`${this.baseUrl}/reserve`, request, { params });
  }
  reserveIntPropertyId(request: ReserveRequestIntProeprtyId): Observable<Result<ReservePropertyResponse>> {
    const params = getLanguageParams();
    return this.http.post<Result<ReservePropertyResponse>>(`${this.baseUrl}/reserve`, request, { params });
  }

  getSessionForHost(sessionId: string, targetLang?: string): Observable<Result<ReservePropertyResponse>> {
    const params = getLanguageParams();
    return this.http
      .get<Result<ReservePropertyResponse>>(`${this.baseUrl}/session/host/${sessionId}`, { params })
  }

  accept(requestId: string): Observable<Result<boolean>> {
    return this.http
      .post<Result<boolean>>(`${this.baseUrl}/accept/${requestId}`, {})
  }
  decline(requestId: string): Observable<Result<boolean>> {
    return this.http
      .post<Result<boolean>>(`${this.baseUrl}/decline/${requestId}`, {})
  }

  updateTargetLanguage(lang: string): void {
    // Convert from language code to full name if a mapping exists
    console.log("lang", lang)
    // const languageName:string|null = languageMapping[lang] || lang;
    const languageName: string | null = lang

    // Check if it's a valid NLLB language
    if (languageName == "null" || languageName == null || languageName == undefined || lang == null || lang == "") {
      targetLang = "";
      localStorage.setItem('chatLanguage', "");
      console.log("languageName", targetLang)
      this._targetLang$.next("")
    }
    else if (nllb_languages[languageName]) {
      targetLang = languageName;
      this._targetLang$.next(languageName)
      localStorage.setItem('chatLanguage', languageName);
      // Clear cache when language changes
      this.messageCache.clear();
    }
  }

  translateMessage(text: string, targetLang: string) {
    targetLang = nllb_languages[targetLang]
    console.log("translating to ", targetLang)
    return this.http
      .post<{ translated_texts: string[] }>(
        "https://ahmedaladl-transliation.hf.space/translate",
        { texts: [text], tgt_lang: targetLang }
      )
  }
}
