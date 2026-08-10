/**
 * Tipos do banco (schema public) — espelham supabase/migrations/0001_init_doca.sql
 *
 * O formato segue o que o `@supabase/postgrest-js` espera em `GenericSchema`:
 * cada tabela precisa de Row / Insert / Update / Relationships, senão o
 * cliente tipado degrada tudo para `never`.
 */

export type UserRole = "admin" | "photographer";
export type MediaType = "photo" | "video";
export type MediaStatus = "pending" | "approved" | "rejected";
export type EventAccent = "purple" | "blue" | "red" | "green";
export type InterestType = "none" | "link" | "count" | "lead";

export type DocaUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  instagram: string | null;
  role: UserRole;
  is_approved: boolean;
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
        Insert: Omit<MenuCategory, "id" | "created_at"> & Partial<Pick<MenuCategory, "id" | "created_at">>;
        Update: Partial<MenuCategory>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at"> & Partial<Pick<MenuItem, "id" | "created_at">>;
        Update: Partial<MenuItem>;
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      event_leads: {
        Row: EventLead;
        Insert: Omit<EventLead, "id" | "created_at"> & Partial<Pick<EventLead, "id" | "created_at">>;
        Update: Partial<EventLead>;
        Relationships: [
          {
            foreignKeyName: "event_leads_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
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
