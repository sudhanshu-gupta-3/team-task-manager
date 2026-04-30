from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .models import RoleEnum, TaskPriorityEnum, TaskStatusEnum


# ── Auth ───────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Project ────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class ProjectMemberResponse(BaseModel):
    id: str
    role: RoleEnum
    joined_at: datetime
    user: UserResponse

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    color: str
    created_at: datetime
    updated_at: datetime
    creator_id: str
    task_count: int = 0
    member_count: int = 0
    completed_count: int = 0

    model_config = {"from_attributes": True}


class ProjectDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    color: str
    created_at: datetime
    updated_at: datetime
    creator_id: str
    members: list[ProjectMemberResponse] = []

    model_config = {"from_attributes": True}


# ── Task ───────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    status: TaskStatusEnum = TaskStatusEnum.TODO
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    priority: Optional[TaskPriorityEnum] = None
    status: Optional[TaskStatusEnum] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatusEnum
    priority: TaskPriorityEnum
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    project_id: str
    assignee_id: Optional[str] = None
    creator_id: str
    assignee: Optional[UserResponse] = None
    creator: Optional[UserResponse] = None

    model_config = {"from_attributes": True}


# ── Team ───────────────────────────────────────────────────────────────
class AddMemberRequest(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.MEMBER


class UpdateMemberRoleRequest(BaseModel):
    role: RoleEnum


# ── Dashboard ──────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_projects: int
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    in_progress_tasks: int
    completion_rate: float
    status_distribution: dict[str, int]
