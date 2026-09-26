from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, AuditLog
from app.schemas.schemas import Token, LoginRequest, UserCreate, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный адрес электронной почты или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Учетная запись заблокирована")
        
    access_token = create_access_token(subject=user.email, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        email=user.email,
        full_name=user.full_name
    )

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким адресом электронной почты уже зарегистрирован"
        )

    role = user_in.role.upper() if user_in.role else "OPERATOR"
    if role not in ["ADMIN", "OPERATOR", "TECH"]:
        role = "OPERATOR"

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
        is_active=True
    )
    db.add(new_user)
    
    audit = AuditLog(
        user_email=new_user.email,
        action="USER_REGISTER",
        details=f"Регистрация нового пользователя: {new_user.full_name} ({new_user.role})"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.email, role=new_user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role,
        email=new_user.email,
        full_name=new_user.full_name
    )

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
