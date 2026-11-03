from sqlalchemy import Column, Integer, String, Boolean, Float, Date, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class StudentSkill(Base):
    __tablename__ = 'student_skills'

    student_id = Column(Integer, ForeignKey('students.student_id', ondelete='CASCADE'), primary_key=True)
    skill_id = Column(Integer, ForeignKey('skills.skill_id', ondelete='CASCADE'), primary_key=True)

    __table_args__ = (
        UniqueConstraint('student_id', 'skill_id', name='uq_student_skill'),
    )

class Student(Base):
    __tablename__ = 'students'

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    roll_no = Column(String(50), nullable=False, unique=True, index=True)
    student_name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    sub_branch = Column(String(50), nullable=True, index=True)
    graduation_year = Column(Integer, nullable=False, index=True)
    eligible = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    skills = relationship('Skill', secondary='student_skills', back_populates='students')
    placements = relationship('Placement', back_populates='student', cascade='all, delete-orphan')

    def to_dict(self, include_placements=True):
        data = {
            'student_id': self.student_id,
            'roll_no': self.roll_no,
            'student_name': self.student_name,
            'department': self.department,
            'sub_branch': self.sub_branch or '',
            'graduation_year': self.graduation_year,
            'eligible': bool(self.eligible),
            'skills': [skill.skill_name for skill in self.skills],
            'placement_count': len(self.placements) if self.placements else 0,
            'is_placed': len(self.placements) > 0,
        }
        if include_placements:
            data['placements'] = [p.to_dict(include_student=False) for p in self.placements]
            if self.placements:
                data['highest_package'] = max((float(p.package_lpa) for p in self.placements if p.package_lpa is not None), default=0.0)
            else:
                data['highest_package'] = 0.0
        return data

class Skill(Base):
    __tablename__ = 'skills'

    skill_id = Column(Integer, primary_key=True, autoincrement=True)
    skill_name = Column(String(100), nullable=False, unique=True, index=True)

    students = relationship('Student', secondary='student_skills', back_populates='skills')

    def to_dict(self):
        return {
            'skill_id': self.skill_id,
            'skill_name': self.skill_name,
            'student_count': len(self.students) if self.students else 0
        }

class Placement(Base):
    __tablename__ = 'placements'

    placement_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False, index=True)
    company = Column(String(150), nullable=False, index=True)
    role = Column(String(150), nullable=False)
    package_lpa = Column(Float, nullable=False, index=True)
    placement_date = Column(Date, nullable=False, index=True)
    status = Column(String(50), nullable=False, default='Placed', index=True)
    created_at = Column(DateTime, default=func.now())

    student = relationship('Student', back_populates='placements')

    @property
    def package(self):
        return self.package_lpa

    @package.setter
    def package(self, value):
        self.package_lpa = value

    def to_dict(self, include_student=True):
        pkg_val = round(float(self.package_lpa), 2) if self.package_lpa is not None else 0.0
        data = {
            'placement_id': self.placement_id,
            'student_id': self.student_id,
            'company': self.company,
            'role': self.role,
            'package': pkg_val,
            'package_lpa': pkg_val,
            'placement_date': self.placement_date.strftime('%Y-%m-%d') if self.placement_date else None,
            'placement_year': self.placement_date.year if self.placement_date else None,
            'status': self.status,
        }
        if include_student and self.student:
            data['roll_no'] = self.student.roll_no
            data['student_name'] = self.student.student_name
            data['department'] = self.student.department
            data['sub_branch'] = self.student.sub_branch or ''
            data['graduation_year'] = self.student.graduation_year
            data['eligible'] = bool(self.student.eligible)
        return data
