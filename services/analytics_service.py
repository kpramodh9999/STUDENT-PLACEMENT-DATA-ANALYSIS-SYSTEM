import pandas as pd
import numpy as np
from sqlalchemy.orm import joinedload
from models import Student, Placement, Skill, StudentSkill

class AnalyticsService:

    @staticmethod
    def load_dataframes(session, grad_year=None, placement_year=None, department=None, sub_branch=None):
        """
        Loads raw data from relational tables into Pandas DataFrames for deep analytics.
        """
        # Query students with skills and placements
        query_students = session.query(Student).options(
            joinedload(Student.skills),
            joinedload(Student.placements)
        )
        
        if grad_year:
            query_students = query_students.filter(Student.graduation_year == grad_year)
        if department:
            query_students = query_students.filter(Student.department == department)
        if sub_branch:
            query_students = query_students.filter(Student.sub_branch == sub_branch)
            
        students = query_students.all()
        
        # Build Students DataFrame
        student_records = []
        student_skill_records = []
        for s in students:
            student_records.append({
                'student_id': s.student_id,
                'roll_no': s.roll_no,
                'student_name': s.student_name,
                'department': s.department,
                'sub_branch': s.sub_branch or '',
                'graduation_year': s.graduation_year,
                'eligible': bool(s.eligible)
            })
            for sk in s.skills:
                student_skill_records.append({
                    'student_id': s.student_id,
                    'department': s.department,
                    'sub_branch': s.sub_branch or '',
                    'skill_id': sk.skill_id,
                    'skill_name': sk.skill_name
                })
                
        df_students = pd.DataFrame(student_records)
        df_skills = pd.DataFrame(student_skill_records)

        # Query Placements
        query_placements = session.query(Placement).options(joinedload(Placement.student))
        placements = query_placements.all()
        
        placement_records = []
        for p in placements:
            p_year = p.placement_date.year if p.placement_date else None
            # Apply placement year filter if provided
            if placement_year and p_year != placement_year:
                continue
            if p.student:
                # Apply student-level department, sub_branch or grad_year filter if specified
                if department and p.student.department != department:
                    continue
                if sub_branch and p.student.sub_branch != sub_branch:
                    continue
                if grad_year and p.student.graduation_year != grad_year:
                    continue
                
                placement_records.append({
                    'placement_id': p.placement_id,
                    'student_id': p.student_id,
                    'roll_no': p.student.roll_no,
                    'student_name': p.student.student_name,
                    'department': p.student.department,
                    'sub_branch': p.student.sub_branch or '',
                    'graduation_year': p.student.graduation_year,
                    'eligible': bool(p.student.eligible),
                    'company': p.company,
                    'role': p.role,
                    'package_lpa': float(p.package_lpa) if p.package_lpa is not None else np.nan,
                    'placement_date': p.placement_date.strftime('%Y-%m-%d') if p.placement_date else None,
                    'placement_year': p_year,
                    'status': p.status
                })

        df_placements = pd.DataFrame(placement_records)
        return df_students, df_placements, df_skills

    @classmethod
    def get_dashboard_summary(cls, session):
        df_students, df_placements, df_skills = cls.load_dataframes(session)

        total_students = len(df_students)
        if total_students == 0:
            return {
                'total_students': 0,
                'eligible_students': 0,
                'unique_placed_students': 0,
                'placement_rate': 0.0,
                'avg_package': 0.0,
                'total_offers': 0,
                'department_overview': [],
                'recent_placements': [],
                'top_skills': [],
                'is_empty': True
            }

        eligible_students = int(df_students['eligible'].sum())
        
        # Placed students: inner join between students and placements
        if len(df_placements) > 0:
            # Filter for valid placement status (Placed, Accepted, Extended, etc.)
            valid_placements = df_placements.dropna(subset=['student_id'])
            placed_student_ids = valid_placements['student_id'].unique()
            unique_placed_students = len(placed_student_ids)

            # Unique eligible placed students
            eligible_placed_df = df_students[
                (df_students['student_id'].isin(placed_student_ids)) & 
                (df_students['eligible'] == True)
            ]
            unique_eligible_placed = len(eligible_placed_df)
            
            # Placement rate strictly per requirement:
            # Placement Rate = (Unique Eligible Students Placed / Total Eligible Students) × 100
            placement_rate = (unique_eligible_placed / eligible_students * 100) if eligible_students > 0 else 0.0
            
            # Packages
            valid_packages = valid_placements['package_lpa'].dropna()
            valid_packages = valid_packages[valid_packages > 0]
            avg_package = float(np.round(valid_packages.mean(), 2)) if len(valid_packages) > 0 else 0.0
            total_offers = len(valid_placements)
        else:
            unique_placed_students = 0
            unique_eligible_placed = 0
            placement_rate = 0.0
            avg_package = 0.0
            total_offers = 0

        # Department overview
        dept_overview = []
        for dept_name, group in df_students.groupby('department'):
            dept_total = len(group)
            dept_eligible = int(group['eligible'].sum())
            if len(df_placements) > 0:
                dept_placed_ids = df_placements[df_placements['department'] == dept_name]['student_id'].unique()
                dept_placed = len(dept_placed_ids)
                dept_eligible_placed = len(group[(group['student_id'].isin(dept_placed_ids)) & (group['eligible'] == True)])
                dept_rate = (dept_eligible_placed / dept_eligible * 100) if dept_eligible > 0 else 0.0
            else:
                dept_placed = 0
                dept_rate = 0.0

            dept_overview.append({
                'department': dept_name,
                'total_students': dept_total,
                'eligible_students': dept_eligible,
                'placed_students': dept_placed,
                'placement_rate': round(dept_rate, 1)
            })

        # Recent placements
        recent_placements = []
        if len(df_placements) > 0:
            df_recent = df_placements.sort_values(by=['placement_date', 'placement_id'], ascending=[False, False]).head(5)
            recent_placements = df_recent.to_dict(orient='records')

        # Top skills
        top_skills = []
        if len(df_skills) > 0:
            skill_counts = df_skills['skill_name'].value_counts().head(6)
            top_skills = [{'skill': k, 'count': int(v)} for k, v in skill_counts.items()]

        return {
            'total_students': total_students,
            'eligible_students': eligible_students,
            'unique_placed_students': unique_placed_students,
            'placement_rate': round(placement_rate, 2),
            'avg_package': avg_package,
            'total_offers': total_offers,
            'department_overview': dept_overview,
            'recent_placements': recent_placements,
            'top_skills': top_skills,
            'is_empty': False
        }

    @classmethod
    def get_department_analytics(cls, session, grad_year=None, placement_year=None, department=None, sub_branch=None):
        df_students, df_placements, _ = cls.load_dataframes(
            session, grad_year=grad_year, placement_year=placement_year, department=department, sub_branch=sub_branch
        )

        if len(df_students) == 0:
            return {'departments': [], 'is_empty': True}

        # If a department is selected (and no single sub_branch is chosen), show breakdown by sub_branch
        group_col = 'sub_branch' if (department and not sub_branch) else 'department'
        group_df = df_students
        if group_col == 'sub_branch':
            group_df = df_students[df_students['sub_branch'].str.len() > 0]
            if len(group_df) == 0:
                group_df = df_students
                group_col = 'department'

        dept_metrics = []
        groups = sorted(group_df[group_col].unique())

        for grp in groups:
            d_students = df_students[df_students[group_col] == grp]
            total_students = len(d_students)
            eligible_students = int(d_students['eligible'].sum())

            if len(df_placements) > 0 and group_col in df_placements.columns:
                d_placements = df_placements[df_placements[group_col] == grp]
                placed_student_ids = d_placements['student_id'].unique()
                unique_placed = len(placed_student_ids)

                # Unique eligible placed
                eligible_placed = len(d_students[(d_students['student_id'].isin(placed_student_ids)) & (d_students['eligible'] == True)])
                placement_rate = (eligible_placed / eligible_students * 100) if eligible_students > 0 else 0.0

                valid_pkg = d_placements['package_lpa'].dropna()
                valid_pkg = valid_pkg[valid_pkg > 0]
                avg_pkg = float(np.round(valid_pkg.mean(), 2)) if len(valid_pkg) > 0 else 0.0
                max_pkg = float(np.round(valid_pkg.max(), 2)) if len(valid_pkg) > 0 else 0.0
                total_offers = len(d_placements)
            else:
                unique_placed = 0
                eligible_placed = 0
                placement_rate = 0.0
                avg_pkg = 0.0
                max_pkg = 0.0
                total_offers = 0

            dept_metrics.append({
                'department': grp,
                'is_sub_branch': group_col == 'sub_branch',
                'parent_department': department if group_col == 'sub_branch' else None,
                'total_students': total_students,
                'eligible_students': eligible_students,
                'unique_placed': unique_placed,
                'eligible_placed': eligible_placed,
                'placement_rate': round(placement_rate, 2),
                'avg_package_lpa': avg_pkg,
                'max_package_lpa': max_pkg,
                'total_offers': total_offers
            })

        return {
            'departments': dept_metrics,
            'is_sub_branch_view': group_col == 'sub_branch',
            'is_empty': len(dept_metrics) == 0
        }

    @classmethod
    def get_package_analytics(cls, session, grad_year=None, placement_year=None, department=None, sub_branch=None):
        _, df_placements, _ = cls.load_dataframes(
            session, grad_year=grad_year, placement_year=placement_year, department=department, sub_branch=sub_branch
        )

        if len(df_placements) == 0:
            return {
                'overall_metrics': {
                    'avg_package': 0.0,
                    'median_package': 0.0,
                    'highest_package': 0.0,
                    'lowest_package': 0.0,
                    'total_offers_analyzed': 0,
                    'unique_students_analyzed': 0
                },
                'distribution_histogram': [],
                'dept_comparison': [],
                'range_distribution': [],
                'is_empty': True
            }

        valid_df = df_placements.dropna(subset=['package_lpa'])
        valid_df = valid_df[valid_df['package_lpa'] > 0]

        if len(valid_df) == 0:
            return {
                'overall_metrics': {
                    'avg_package': 0.0,
                    'median_package': 0.0,
                    'highest_package': 0.0,
                    'lowest_package': 0.0,
                    'total_offers_analyzed': 0,
                    'unique_students_analyzed': 0
                },
                'distribution_histogram': [],
                'dept_comparison': [],
                'range_distribution': [],
                'is_empty': True
            }

        packages = valid_df['package_lpa'].to_numpy()

        # Offer-level analysis
        avg_pkg = float(np.round(np.mean(packages), 2))
        median_pkg = float(np.round(np.median(packages), 2))
        max_pkg = float(np.round(np.max(packages), 2))
        min_pkg = float(np.round(np.min(packages), 2))
        total_offers = len(valid_df)

        # Unique student package analysis (student's top package)
        student_top_pkg = valid_df.groupby('student_id')['package_lpa'].max().to_numpy()
        student_avg_pkg = float(np.round(np.mean(student_top_pkg), 2))
        unique_students_count = len(student_top_pkg)

        # Salary Brackets / Ranges
        # < 4 LPA, 4-7 LPA, 7-10 LPA, 10-15 LPA, 15-25 LPA, > 25 LPA
        bins = [0, 4.0, 7.0, 10.0, 15.0, 25.0, 999.0]
        labels = ['< 4 LPA', '4 - 7 LPA', '7 - 10 LPA', '10 - 15 LPA', '15 - 25 LPA', '> 25 LPA']
        valid_df['range_bin'] = pd.cut(valid_df['package_lpa'], bins=bins, labels=labels, right=False)
        range_counts = valid_df['range_bin'].value_counts()[labels]

        range_distribution = []
        for label, count in range_counts.items():
            pct = round((count / total_offers) * 100, 1) if total_offers > 0 else 0
            range_distribution.append({
                'range': label,
                'count': int(count),
                'percentage': pct
            })

        # Department comparison
        dept_comp = []
        for dept_name, group in valid_df.groupby('department'):
            dept_pkgs = group['package_lpa'].to_numpy()
            dept_comp.append({
                'department': dept_name,
                'avg_package': float(np.round(np.mean(dept_pkgs), 2)),
                'median_package': float(np.round(np.median(dept_pkgs), 2)),
                'highest_package': float(np.round(np.max(dept_pkgs), 2)),
                'lowest_package': float(np.round(np.min(dept_pkgs), 2)),
                'offers_count': len(dept_pkgs)
            })

        # Sorted histogram intervals (e.g. 5-7 dynamic bins for histogram view)
        hist_counts, bin_edges = np.histogram(packages, bins=min(6, max(3, len(np.unique(packages)))) if len(packages) > 3 else 3)
        distribution_histogram = []
        for i in range(len(hist_counts)):
            label = f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f} LPA"
            distribution_histogram.append({
                'interval': label,
                'count': int(hist_counts[i])
            })

        return {
            'overall_metrics': {
                'avg_package': avg_pkg,
                'median_package': median_pkg,
                'highest_package': max_pkg,
                'lowest_package': min_pkg,
                'student_avg_highest_package': student_avg_pkg,
                'total_offers_analyzed': total_offers,
                'unique_students_analyzed': unique_students_count
            },
            'distribution_histogram': distribution_histogram,
            'dept_comparison': dept_comp,
            'range_distribution': range_distribution,
            'is_empty': False
        }

    @classmethod
    def get_skill_insights(cls, session, grad_year=None, department=None, sub_branch=None):
        df_students, df_placements, df_skills = cls.load_dataframes(
            session, grad_year=grad_year, department=department, sub_branch=sub_branch
        )

        if len(df_skills) == 0:
            return {
                'most_common_skills': [],
                'placed_vs_unplaced': [],
                'department_skills': [],
                'placed_student_skills': [],
                'is_empty': True
            }

        total_students = len(df_students)
        placed_student_ids = set(df_placements['student_id'].unique()) if len(df_placements) > 0 else set()
        unplaced_student_ids = set(df_students['student_id'].unique()) - placed_student_ids

        total_placed = len(placed_student_ids)
        total_unplaced = len(unplaced_student_ids)

        # Most common skills overall
        skill_counts = df_skills['skill_name'].value_counts()
        most_common_skills = []
        for skill_name, count in skill_counts.items():
            most_common_skills.append({
                'skill_name': skill_name,
                'student_count': int(count),
                'percentage': round((count / total_students * 100), 1) if total_students > 0 else 0.0
            })

        # Placed vs Not-yet-placed comparison
        comparison = []
        for skill_name in skill_counts.index:
            students_with_skill = set(df_skills[df_skills['skill_name'] == skill_name]['student_id'])
            
            placed_with_skill = len(students_with_skill.intersection(placed_student_ids))
            unplaced_with_skill = len(students_with_skill.intersection(unplaced_student_ids))

            placed_pct = round((placed_with_skill / total_placed * 100), 1) if total_placed > 0 else 0.0
            unplaced_pct = round((unplaced_with_skill / total_unplaced * 100), 1) if total_unplaced > 0 else 0.0

            comparison.append({
                'skill_name': skill_name,
                'placed_count': placed_with_skill,
                'placed_percentage': placed_pct,
                'unplaced_count': unplaced_with_skill,
                'unplaced_percentage': unplaced_pct,
                'total_count': int(skill_counts[skill_name])
            })

        # Skills commonly found among placed students
        df_placed_skills = df_skills[df_skills['student_id'].isin(placed_student_ids)]
        placed_skills_counts = df_placed_skills['skill_name'].value_counts()
        placed_student_skills = []
        for skill_name, count in placed_skills_counts.items():
            placed_student_skills.append({
                'skill_name': skill_name,
                'placed_count': int(count),
                'percentage': round((count / total_placed * 100), 1) if total_placed > 0 else 0.0
            })

        # Skill distribution by department
        dept_skill_matrix = []
        if 'department' in df_skills.columns:
            top_8_skills = skill_counts.head(8).index.tolist()
            pivot = pd.crosstab(df_skills['department'], df_skills['skill_name'])
            
            for dept in sorted(df_skills['department'].unique()):
                dept_entry = {'department': dept}
                for s in top_8_skills:
                    dept_entry[s] = int(pivot.loc[dept, s]) if (dept in pivot.index and s in pivot.columns) else 0
                dept_skill_matrix.append(dept_entry)

        return {
            'most_common_skills': most_common_skills,
            'placed_vs_unplaced': comparison,
            'placed_student_skills': placed_student_skills,
            'department_skills': dept_skill_matrix,
            'is_empty': False
        }
