export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  password_hash?: string;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: number;
}

export interface ProjectWithRole extends Project {
  role: ProjectRole;
  owner_name?: string;
  owner_email?: string;
}

export interface CreateUserData {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  passwordHash?: string;
}

export interface CreateProjectData {
  id?: string;
  ownerId: string;
  name?: string;
  content?: string;
}

/**
 * Unified database abstraction interface for Braid.
 * Supports both PostgreSQL (production) and SQLite (local dev/tests).
 */
export interface DatabaseAdapter {
  readonly type: 'postgres' | 'sqlite';
  init(): Promise<void> | void;
  close(): Promise<void> | void;
  isHealthy(): Promise<boolean>;

  // User repository
  createUser(data: CreateUserData): Promise<User> | User;
  getUserById(id: string): Promise<User | null> | (User | null);
  getUserByEmail(email: string): Promise<User | null> | (User | null);

  // Session repository
  createSession(userId: string, ttlDays?: number): Promise<Session> | Session;
  getSession(sessionId: string): Promise<(Session & { user: User }) | null> | ((Session & { user: User }) | null);
  deleteSession(sessionId: string): Promise<void> | void;
  deleteSessionsForUser(userId: string): Promise<void> | void;

  // Project repository
  createProject(data: CreateProjectData): Promise<Project> | Project;
  getProject(id: string): Promise<Project | null> | (Project | null);
  listProjectsForUser(userId: string): Promise<ProjectWithRole[]> | ProjectWithRole[];
  updateProjectName(id: string, name: string): Promise<boolean> | boolean;
  updateProjectContent(id: string, content: string): Promise<boolean> | boolean;
  deleteProject(id: string): Promise<boolean> | boolean;
  duplicateProject(sourceProjectId: string, newOwnerId: string, newName?: string): Promise<Project | null> | (Project | null);

  // Members & Authorization
  getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> | (ProjectRole | null);
  addProjectMember(projectId: string, userId: string, role: 'EDITOR' | 'VIEWER'): Promise<void> | void;
  removeProjectMember(projectId: string, userId: string): Promise<void> | void;
  listProjectMembers(projectId: string): Promise<Array<{ user: User; role: ProjectRole }>> | Array<{ user: User; role: ProjectRole }>;
}
