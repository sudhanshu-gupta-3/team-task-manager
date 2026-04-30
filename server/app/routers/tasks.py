from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_current_user, require_project_admin, require_project_member
from ..models import (
    ProjectMember,
    RoleEnum,
    Task,
    TaskPriorityEnum,
    TaskStatusEnum,
    User,
)
from ..schemas import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/api/projects/{project_id}/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    project_id: str,
    status: TaskStatusEnum | None = Query(None),
    priority: TaskPriorityEnum | None = Query(None),
    assignee_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_member()),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.project_id == project_id)
    )
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)

    tasks = query.order_by(Task.created_at.desc()).all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    project_id: str,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    # Validate assignee is a project member if provided
    if data.assignee_id:
        member = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == data.assignee_id,
            )
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=400, detail="Assignee is not a member of this project"
            )

    task = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=data.status,
        due_date=data.due_date,
        assignee_id=data.assignee_id,
        project_id=project_id,
        creator_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Reload with relationships
    task = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.id == task.id)
        .first()
    )
    return TaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    project_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_member()),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.id == task_id, Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: str,
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check membership
    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a project member")

    update_data = data.model_dump(exclude_unset=True)

    # Members can only update status
    if membership.role == RoleEnum.MEMBER:
        allowed = {"status"}
        extra_fields = set(update_data.keys()) - allowed
        if extra_fields:
            raise HTTPException(
                status_code=403,
                detail="Members can only update task status",
            )

    # Validate assignee
    if "assignee_id" in update_data and update_data["assignee_id"]:
        member = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == update_data["assignee_id"],
            )
            .first()
        )
        if not member:
            raise HTTPException(
                status_code=400, detail="Assignee is not a member of this project"
            )

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    task = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.id == task.id)
        .first()
    )
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    project_id: str,
    task_id: str,
    current_user: User = Depends(get_current_user),
    _=Depends(require_project_admin()),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
