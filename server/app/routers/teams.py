from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_project_admin, require_project_member
from ..models import ProjectMember, RoleEnum, User
from ..schemas import (
    AddMemberRequest,
    ProjectMemberResponse,
    UpdateMemberRoleRequest,
)

router = APIRouter(prefix="/api/projects/{project_id}/members", tags=["Team"])


@router.get("", response_model=list[ProjectMemberResponse])
async def list_members(
    project_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_member()),
    db: Session = Depends(get_db),
):
    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
    return [ProjectMemberResponse.model_validate(m) for m in members]


@router.post("", response_model=ProjectMemberResponse, status_code=201)
async def add_member(
    project_id: str,
    data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    # Find user by email
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check if already a member
    existing = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a project member")

    membership = ProjectMember(
        user_id=user.id,
        project_id=project_id,
        role=data.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return ProjectMemberResponse.model_validate(membership)


@router.put("/{member_id}", response_model=ProjectMemberResponse)
async def update_member_role(
    project_id: str,
    member_id: str,
    data: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    # Prevent demoting yourself if you're the last admin
    if membership.user_id == current_user.id and data.role == RoleEnum.MEMBER:
        admin_count = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role == RoleEnum.ADMIN,
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, detail="Cannot demote: you are the last admin"
            )

    membership.role = data.role
    db.commit()
    db.refresh(membership)
    return ProjectMemberResponse.model_validate(membership)


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    project_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    # Prevent removing the last admin
    if membership.role == RoleEnum.ADMIN:
        admin_count = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role == RoleEnum.ADMIN,
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=400, detail="Cannot remove the last admin"
            )

    db.delete(membership)
    db.commit()
