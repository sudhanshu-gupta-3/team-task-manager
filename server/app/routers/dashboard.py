from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Project, ProjectMember, Task, TaskStatusEnum, User
from ..schemas import DashboardStats, TaskResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Get user's project IDs
    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    project_ids = [m.project_id for m in memberships]

    total_projects = len(project_ids)

    if not project_ids:
        return DashboardStats(
            total_projects=0,
            total_tasks=0,
            completed_tasks=0,
            overdue_tasks=0,
            in_progress_tasks=0,
            completion_rate=0.0,
            status_distribution={s.value: 0 for s in TaskStatusEnum},
        )

    tasks = db.query(Task).filter(Task.project_id.in_(project_ids)).all()
    total_tasks = len(tasks)
    now = datetime.now(timezone.utc)

    completed = sum(1 for t in tasks if t.status == TaskStatusEnum.DONE)
    overdue = sum(
        1
        for t in tasks
        if t.due_date
        and t.due_date.replace(tzinfo=timezone.utc) < now
        and t.status != TaskStatusEnum.DONE
    )
    in_progress = sum(1 for t in tasks if t.status == TaskStatusEnum.IN_PROGRESS)

    status_dist = {s.value: 0 for s in TaskStatusEnum}
    for t in tasks:
        status_dist[t.status.value] = status_dist.get(t.status.value, 0) + 1

    return DashboardStats(
        total_projects=total_projects,
        total_tasks=total_tasks,
        completed_tasks=completed,
        overdue_tasks=overdue,
        in_progress_tasks=in_progress,
        completion_rate=round((completed / total_tasks * 100) if total_tasks else 0, 1),
        status_distribution=status_dist,
    )


@router.get("/my-tasks", response_model=list[TaskResponse])
async def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(Task.assignee_id == current_user.id)
        .order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
        .all()
    )
    return [TaskResponse.model_validate(t) for t in tasks]
