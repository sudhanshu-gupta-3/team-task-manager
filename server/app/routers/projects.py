from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_project_admin, require_project_member
from ..models import Project, ProjectMember, RoleEnum, Task, TaskStatusEnum, User
from ..schemas import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    project_ids = [m.project_id for m in memberships]
    if not project_ids:
        return []

    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()

    result = []
    for project in projects:
        task_count = db.query(Task).filter(Task.project_id == project.id).count()
        member_count = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project.id)
            .count()
        )
        completed_count = (
            db.query(Task)
            .filter(Task.project_id == project.id, Task.status == TaskStatusEnum.DONE)
            .count()
        )
        resp = ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            color=project.color,
            created_at=project.created_at,
            updated_at=project.updated_at,
            creator_id=project.creator_id,
            task_count=task_count,
            member_count=member_count,
            completed_count=completed_count,
        )
        result.append(resp)

    return result


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(
        name=data.name,
        description=data.description,
        color=data.color,
        creator_id=current_user.id,
    )
    db.add(project)
    db.flush()

    membership = ProjectMember(
        user_id=current_user.id,
        project_id=project.id,
        role=RoleEnum.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        created_at=project.created_at,
        updated_at=project.updated_at,
        creator_id=project.creator_id,
        task_count=0,
        member_count=1,
        completed_count=0,
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_member()),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectDetailResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    task_count = db.query(Task).filter(Task.project_id == project.id).count()
    member_count = (
        db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()
    )
    completed_count = (
        db.query(Task)
        .filter(Task.project_id == project.id, Task.status == TaskStatusEnum.DONE)
        .count()
    )

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        created_at=project.created_at,
        updated_at=project.updated_at,
        creator_id=project.creator_id,
        task_count=task_count,
        member_count=member_count,
        completed_count=completed_count,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
