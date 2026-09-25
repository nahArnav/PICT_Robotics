export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'applicant' | 'recruiter' | 'admin' | 'super_admin';
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'waitlisted'
  | 'rejected'
  | 'withdrawn';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  roll_number: string | null;
  branch: string | null;
  year: 'FY' | 'SY' | null;
  division: string | null;
  profile_photo_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
  skills: string[];
  programming_languages: string[];
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  applicant_id: string;
  recruitment_cycle_id: string;
  status: ApplicationStatus;
  motivation: string | null;
  experience_summary: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'email'>>;
      user_roles: Table<{
        id: string;
        user_id: string;
        role: AppRole;
        created_at: string;
        updated_at: string;
      }>;
      recruitment_cycles: Table<{
        id: string;
        name: string;
        academic_year: string;
        target_batch: string;
        description: string | null;
        application_open: string;
        application_close: string;
        status: 'draft' | 'upcoming' | 'open' | 'closed' | 'completed';
        created_at: string;
        updated_at: string;
      }>;
      domains: Table<{
        id: string;
        name: string;
        short_description: string | null;
        detailed_description: string | null;
        icon: string | null;
        image_url: string | null;
        active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      }>;
      applications: Table<ApplicationRow>;
      application_domain_preferences: Table<{
        id: string;
        application_id: string;
        domain_id: string;
        preference_order: number;
        created_at: string;
      }>;
      application_answers: Table<{
        id: string;
        application_id: string;
        question_id: string;
        answer: Json;
        created_at: string;
        updated_at: string;
      }>;
      recruitment_questions: Table<{
        id: string;
        recruitment_cycle_id: string;
        question: string;
        question_type: string;
        required: boolean;
        display_order: number;
        active: boolean;
        options: Json;
        created_at: string;
      }>;
      interviews: Table<{
        id: string;
        application_id: string;
        round_id: string | null;
        interviewer_id: string | null;
        scheduled_at: string;
        duration_minutes: number;
        location: string | null;
        meeting_url: string | null;
        status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
      evaluations: Table<{
        id: string;
        application_id: string;
        round_id: string | null;
        evaluator_id: string;
        technical_score: number | null;
        communication_score: number | null;
        problem_solving_score: number | null;
        teamwork_score: number | null;
        overall_score: number | null;
        feedback: string | null;
        recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | null;
        created_at: string;
        updated_at: string;
      }>;
      admin_invites: Table<{
        id: string;
        email: string;
        role: Exclude<AppRole, 'applicant'>;
        token: string | null;
        token_hash: string;
        created_by: string;
        expires_at: string;
        accepted_at: string | null;
        accepted_by: string | null;
        revoked_at: string | null;
        created_at: string;
      }>;
      notifications: Table<{
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        read_at: string | null;
        created_at: string;
      }>;
      club_events: Table<{
        id: string;
        title: string;
        summary: string;
        description: string | null;
        category: string;
        starts_at: string;
        ends_at: string | null;
        location: string;
        registration_url: string | null;
        capacity: number | null;
        image_url: string | null;
        status: 'draft' | 'published' | 'cancelled' | 'completed';
        featured: boolean;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      achievements: Table<Record<string, unknown>>;
      projects: Table<Record<string, unknown>>;
      announcements: Table<Record<string, unknown>>;
      audit_logs: Table<Record<string, unknown>>;
      application_reviewer_assignments: Table<Record<string, unknown>>;
      recruitment_rounds: Table<Record<string, unknown>>;
    };
    Views: Record<string, never>;
    Functions: {
      accept_admin_invite: { Args: { p_token: string }; Returns: AppRole };
      create_admin_invite: {
        Args: { p_email: string; p_role: Exclude<AppRole, 'applicant'>; p_expires_at?: string };
        Returns: { id: string; token: string; expires_at: string }[];
      };
      revoke_admin_invite: { Args: { p_invite_id: string }; Returns: undefined };
      save_application_draft: {
        Args: {
          p_recruitment_cycle_id: string;
          p_motivation: string | null;
          p_experience_summary: string | null;
          p_github_url: string | null;
          p_portfolio_url: string | null;
          p_domain_ids: string[];
          p_answers?: Json;
        };
        Returns: ApplicationRow;
      };
      submit_application: { Args: { p_application_id: string }; Returns: ApplicationRow };
      update_application_status: { Args: { p_application_id: string; p_status: ApplicationStatus }; Returns: ApplicationRow };
    };
    Enums: {
      app_role: AppRole;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
