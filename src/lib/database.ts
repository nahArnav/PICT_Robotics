export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined;
    }
  | Json[];

export type AppRole = "applicant" | "admin" | "super_admin";
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "selected"
  | "waitlisted"
  | "rejected"
  | "withdrawn";

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
  year: "FY" | "SY" | null;
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
  form_schema: Json | null;
  form_revision: number | null;
  form_values: Json;
};

export type ApplicationFormConfigRow = {
  recruitment_cycle_id: string;
  draft_schema: Json;
  draft_revision: number;
  published_schema: Json | null;
  published_revision: number;
  updated_by: string | null;
  updated_at: string;
  published_at: string | null;
};

export type ContentRow = {
  id: string;
  title: string;
  description: string;
  year: number;
  category: string | null;
  image_url: string | null;
  featured: boolean;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
export type RoundRow = {
  id: string;
  recruitment_cycle_id: string;
  name: string;
  description: string | null;
  round_type: string;
  start_at: string | null;
  end_at: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
};
export type TaskRow = {
  id: string;
  recruitment_cycle_id: string;
  title: string;
  instructions: string;
  deadline: string;
  active: boolean;
  created_at: string;
};
export type TaskSubmissionRow = {
  id: string;
  task_id: string;
  application_id: string;
  repository_url: string;
  demo_url: string;
  notes: string | null;
  submitted_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & Pick<ProfileRow, "id" | "email">>;
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
        status: "draft" | "upcoming" | "open" | "closed" | "completed";
        max_preferences: number;
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
      recruitment_application_forms: Table<ApplicationFormConfigRow>;
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
        status: "scheduled" | "completed" | "cancelled" | "no_show";
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
        recommendation: "strong_yes" | "yes" | "maybe" | "no" | null;
        rubric_scores: Json;
        created_at: string;
        updated_at: string;
      }>;
      admin_invites: Table<{
        id: string;
        email: string;
        role: Exclude<AppRole, "applicant">;
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
        status: "draft" | "published" | "cancelled" | "completed";
        featured: boolean;
        display_order: number;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      achievements: Table<
        ContentRow & {
          external_url: string | null;
          competition: string | null;
          rank: string | null;
          team: string | null;
          major: boolean;
        }
      >;
      projects: Table<
        ContentRow & {
          slug: string | null;
          repository_url: string | null;
          demo_url: string | null;
          tags: string[];
        }
      >;
      announcements: Table<{
        id: string;
        title: string;
        content: string;
        type: string;
        published: boolean;
        published_at: string | null;
        expires_at: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      application_reviewer_assignments: Table<{
        id: string;
        application_id: string;
        reviewer_id: string;
        assigned_by: string | null;
        created_at: string;
      }>;
      recruitment_rounds: Table<RoundRow>;
      recruitment_tasks: Table<TaskRow>;
      task_submissions: Table<TaskSubmissionRow>;
      application_notes: Table<{
        id: string;
        application_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }>;
      club_team_entries: Table<{
        id: string;
        title: string;
        names: string[];
        image_url: string | null;
        description: string | null;
        published: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      }>;
      gallery_items: Table<{
        id: string;
        title: string;
        image_url: string;
        published: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      }>;
      homepage_metrics: Table<{
        id: string;
        title: string;
        value: string;
        published: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      application_file_is_locked: { Args: { p_path: string }; Returns: boolean };
      save_application_form: {
        Args: { p_cycle_id: string; p_schema: Json; p_expected_revision: number };
        Returns: ApplicationFormConfigRow;
      };
      publish_application_form: {
        Args: { p_cycle_id: string; p_expected_revision: number };
        Returns: ApplicationFormConfigRow;
      };
      unpublish_application_form: {
        Args: { p_cycle_id: string; p_expected_revision: number };
        Returns: undefined;
      };
      get_published_application_form: { Args: { p_cycle_id: string }; Returns: Json };
      save_built_application_draft: {
        Args: { p_cycle_id: string; p_form_revision: number; p_values: Json };
        Returns: ApplicationRow;
      };
      inspect_admin_invite: {
        Args: { p_token: string };
        Returns: {
          email: string;
          role: AppRole;
          expires_at: string;
        }[];
      };
      staff_directory: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          role: AppRole;
        }[];
      };
      my_interviews: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          application_id: string;
          scheduled_at: string;
          duration_minutes: number;
          location: string | null;
          meeting_url: string | null;
          status: string;
        }[];
      };
      list_applications: {
        Args: {
          p_search?: string;
          p_status?: string;
          p_year?: string;
          p_branch?: string;
          p_domain?: string;
          p_cycle_id?: string;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      dashboard_metrics: {
        Args: { p_cycle_id?: string };
        Returns: Json;
      };
      schedule_interview: {
        Args: {
          p_application_id: string;
          p_scheduled_at: string;
          p_interviewer_id: string;
          p_duration?: number;
          p_location?: string;
          p_meeting_url?: string;
          p_interview_id?: string;
          p_status?: "scheduled" | "cancelled" | "completed" | "no_show";
          p_round_id?: string;
        };
        Returns: Database["public"]["Tables"]["interviews"]["Row"];
      };
      submit_task: {
        Args: {
          p_task_id: string;
          p_application_id: string;
          p_repository_url: string;
          p_demo_url: string;
          p_notes?: string;
        };
        Returns: TaskSubmissionRow;
      };
      set_user_role: {
        Args: {
          p_user_id: string;
          p_role: AppRole;
        };
        Returns: undefined;
      };
      send_member_notifications: {
        Args: {
          p_user_ids: string[];
          p_title: string;
          p_message: string;
          p_request_id: string;
        };
        Returns: number;
      };
      accept_admin_invite: {
        Args: { p_token: string };
        Returns: AppRole;
      };
      create_admin_invite: {
        Args: {
          p_email: string;
          p_role: Exclude<AppRole, "applicant">;
          p_expires_at?: string;
        };
        Returns: {
          id: string;
          token: string;
          expires_at: string;
        }[];
      };
      revoke_admin_invite: {
        Args: { p_invite_id: string };
        Returns: undefined;
      };
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
      submit_application: {
        Args: { p_application_id: string };
        Returns: ApplicationRow;
      };
      update_application_status: {
        Args: {
          p_application_id: string;
          p_status: ApplicationStatus;
        };
        Returns: ApplicationRow;
      };
    };
    Enums: {
      app_role: AppRole;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
