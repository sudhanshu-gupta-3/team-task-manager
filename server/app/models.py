import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base


# ── Enums ──────────────────────────────────────────────────────────────
class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class TaskStatusEnum(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"


class TaskPriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


# ── User ───────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    created_projects = relationship("Project", back_populates="creator")
    assigned_tasks = relationship("Task", foreign_keys="Task.assignee_id", back_populates="assignee")
    created_tasks = relationship("Task", foreign_keys="Task.creator_id", back_populates="creator")


# ── Project ────────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6366f1")
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)

    creator = relationship("User", back_populates="created_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


# ── ProjectMember (join table with role) ───────────────────────────────
class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, default=_uuid)
    role = Column(Enum(RoleEnum), default=RoleEnum.MEMBER, nullable=False)
    joined_at = Column(DateTime(timezone=True), default=_now)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="memberships")
    project = relationship("Project", back_populates="members")

    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project"),)


# ── Task ───────────────────────────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.TODO, nullable=False)
    priority = Column(Enum(TaskPriorityEnum), default=TaskPriorityEnum.MEDIUM, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tasks")
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_tasks")
