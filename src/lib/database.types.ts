/**
 * Tipos do banco (schema public) — espelham supabase/migrations/0001_init_doca.sql .. 0010_rbac_and_operations.sql
 *
 * O formato segue o que o `@supabase/postgrest-js` espera em `GenericSchema`:
 * cada tabela precisa de Row / Insert / Update / Relationships, senão o
 * cliente tipado degrada tudo para `never`.
 */

import type {
  PepperCreator,
  PepperCreatorService,
  PepperMedia,
  PepperQuote,
  PepperService,
} from "@/lib/pepper/types";

export type UserRole =
  | "admin"
  | "promoter"
  | "producer"
  | "bar_manager"
  | "hostess"
  | "photographer"
  | "creator";

export type StaffPermission =
  | "events"
  | "media_mod"
  | "vip_crm"
  | "camarotes"
  | "door_checkin"
  | "menu"
  | "pepper"
  | "upload";

export type MediaType = "photo" | "video";
export type MediaStatus = "pending" | "approved" | "rejected";
export type EventAccent = "purple" | "blue" | "red" | "green";
export type InterestType = "none" | "link" | "count" | "lead";
export type BirthdayLeadStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "attended"
  | "cancelled";

export type SpaceCode =
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "C6"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7";

export type SpaceAvailabilityStatus = "available" | "negotiating" | "reserved";

export type DocaUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  instagram: string | null;
  role: UserRole;
  is_approved: boolean;
  permissions: string[];
  created_at: string;
};

export type StaffInviteRole = Exclude<UserRole, "creator">;

export type StaffInvite = {
  id: string;
  email: string;
  full_name: string;
  role: StaffInviteRole;
  permissions: string[];
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type DocaEvent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date: string;
  cover_image: string | null;
  accent: EventAccent;
  is_published: boolean;
  ticket_url: string | null;
  interest_type: InterestType;
  interest_count: number;
  instagram_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
  created_at: string;
};

export type EventLead = {
  id: string;
  event_id: string;
  name: string;
  whatsapp: string;
  created_at: string;
};

export type BirthdayLead = {
  id: string;
  full_name: string;
  whatsapp: string;
  instagram: string;
  birth_date: string;
  event_id: string | null;
  event_label: string;
  guest_tier: string;
  wants_camarote: boolean;
  share_token: string;
  status: BirthdayLeadStatus;
  extra_checked_in: number;
  claimed_tiers: string[];
  notes: string | null;
  created_at: string;
};

export type BirthdayGuest = {
  id: string;
  lead_id: string;
  guest_name: string;
  document_hint: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
};

export type EventSpaceStatus = {
  id: string;
  event_id: string;
  space_code: SpaceCode;
  status: SpaceAvailabilityStatus;
  client_name: string | null;
  client_whatsapp: string | null;
  notes: string | null;
  updated_at: string;
};

export type PublicEventSpaceStatus = {
  event_id: string;
  space_code: SpaceCode;
  status: SpaceAvailabilityStatus;
};

export type DocaMedia = {
  id: string;
  event_id: string;
  photographer_id: string | null;
  drive_file_id: string | null;
  url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  type: MediaType;
  caption: string | null;
  width: number | null;
  height: number | null;
  status: MediaStatus;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: DocaUser;
        Insert: { id: string } & Partial<Omit<DocaUser, "id">>;
        Update: Partial<DocaUser>;
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_invites: {
        Row: StaffInvite;
        Insert: Omit<StaffInvite, "id" | "created_at" | "accepted_at" | "permissions" | "invited_by"> &
        Partial<Pick<StaffInvite, "id" | "created_at" | "accepted_at" | "permissions" | "invited_by">>;
        Update: Partial<StaffInvite>;
        Relationships: [
          {
            foreignKeyName: "staff_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: DocaEvent;
        Insert: Omit<DocaEvent, "id" | "created_at"> &
        Partial<Pick<DocaEvent, "id" | "created_at">>;
        Update: Partial<DocaEvent>;
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: Omit<MenuCategory, "id" | "created_at"> &
        Partial<Pick<MenuCategory, "id" | "created_at">>;
        Update: Partial<MenuCategory>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at"> &
        Partial<Pick<MenuItem, "id" | "created_at">>;
        Update: Partial<MenuItem>;
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      event_leads: {
        Row: EventLead;
        Insert: Omit<EventLead, "id" | "created_at"> &
        Partial<Pick<EventLead, "id" | "created_at">>;
        Update: Partial<EventLead>;
        Relationships: [
          {
            foreignKeyName: "event_leads_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      birthday_leads: {
        Row: BirthdayLead;
        Insert: Omit<
          BirthdayLead,
          | "id"
          | "created_at"
          | "share_token"
          | "status"
          | "extra_checked_in"
          | "claimed_tiers"
          | "notes"
        > &
        Partial<
          Pick<
            BirthdayLead,
            | "id"
            | "created_at"
            | "share_token"
            | "status"
            | "extra_checked_in"
            | "claimed_tiers"
            | "notes"
          >
        >;
        Update: Partial<BirthdayLead>;
        Relationships: [
          {
            foreignKeyName: "birthday_leads_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      birthday_guests: {
        Row: BirthdayGuest;
        Insert: Omit<
          BirthdayGuest,
          "id" | "created_at" | "checked_in" | "checked_in_at" | "document_hint"
        > &
        Partial<
          Pick<
            BirthdayGuest,
            "id" | "created_at" | "checked_in" | "checked_in_at" | "document_hint"
          >
        >;
        Update: Partial<BirthdayGuest>;
        Relationships: [
          {
            foreignKeyName: "birthday_guests_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "birthday_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      event_space_status: {
        Row: EventSpaceStatus;
        Insert: Omit<
          EventSpaceStatus,
          "id" | "updated_at" | "status" | "client_name" | "client_whatsapp" | "notes"
        > &
        Partial<
          Pick<
            EventSpaceStatus,
            "id" | "updated_at" | "status" | "client_name" | "client_whatsapp" | "notes"
          >
        >;
        Update: Partial<EventSpaceStatus>;
        Relationships: [
          {
            foreignKeyName: "event_space_status_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: DocaMedia;
        Insert: Omit<DocaMedia, "id" | "created_at"> &
        Partial<Pick<DocaMedia, "id" | "created_at">>;
        Update: Partial<DocaMedia>;
        Relationships: [
          {
            foreignKeyName: "media_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_photographer_id_fkey";
            columns: ["photographer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pepper_creators: {
        Row: PepperCreator;
        Insert: Omit<PepperCreator, "id" | "created_at"> &
        Partial<Pick<PepperCreator, "id" | "created_at">>;
        Update: Partial<PepperCreator>;
        Relationships: [
          {
            foreignKeyName: "pepper_creators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pepper_media: {
        Row: PepperMedia;
        Insert: Omit<PepperMedia, "id" | "created_at"> &
        Partial<Pick<PepperMedia, "id" | "created_at">>;
        Update: Partial<PepperMedia>;
        Relationships: [
          {
            foreignKeyName: "pepper_media_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "pepper_creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pepper_media_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pepper_media_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      pepper_services: {
        Row: PepperService;
        Insert: Omit<PepperService, "id"> & Partial<Pick<PepperService, "id">>;
        Update: Partial<PepperService>;
        Relationships: [];
      };
      pepper_quotes: {
        Row: PepperQuote;
        Insert: Omit<PepperQuote, "id" | "created_at" | "status"> &
        Partial<Pick<PepperQuote, "id" | "created_at" | "status">>;
        Update: Partial<PepperQuote>;
        Relationships: [];
      };
      pepper_creator_services: {
        Row: PepperCreatorService;
        Insert: Omit<PepperCreatorService, "is_active"> &
        Partial<Pick<PepperCreatorService, "is_active">>;
        Update: Partial<PepperCreatorService>;
        Relationships: [
          {
            foreignKeyName: "pepper_creator_services_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "pepper_creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pepper_creator_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "pepper_services";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      is_approved_photographer: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      has_permission: {
        Args: { p_perm: string };
        Returns: boolean;
      };
      claim_my_staff_invite: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      increment_event_interest: {
        Args: { p_event_id: string };
        Returns: number;
      };
      get_birthday_list_by_token: {
        Args: { p_token: string };
        Returns: unknown;
      };
      add_birthday_guest_by_token: {
        Args: {
          p_token: string;
          p_guest_name: string;
          p_document_hint?: string | null;
        };
        Returns: unknown;
      };
      remove_birthday_guest_by_token: {
        Args: {
          p_token: string;
          p_guest_id: string;
        };
        Returns: boolean;
      };
      get_public_event_spaces: {
        Args: { p_event_id?: string | null };
        Returns: PublicEventSpaceStatus[];
      };
    };
    Enums: {
      user_role: UserRole;
      media_type: MediaType;
      media_status: MediaStatus;
      event_accent: EventAccent;
    };
    CompositeTypes: Record<never, never>;
  };
}
