import io
import matplotlib
matplotlib.use('Agg')  # Headless backend for web server
import matplotlib.pyplot as plt
import numpy as np
from services.analytics_service import AnalyticsService

class ReportService:

    @classmethod
    def generate_department_placement_chart(cls, session):
        """Generates a high-resolution Matplotlib bar chart of Department Placement Rates."""
        data = AnalyticsService.get_department_analytics(session)
        depts = data.get('departments', [])
        
        plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
        fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
        
        if not depts:
            ax.text(0.5, 0.5, "No Department Data Available", horizontalalignment='center', verticalalignment='center', fontsize=14, color='#64748b')
            ax.set_axis_off()
        else:
            names = [d['department'] for d in depts]
            rates = [d['placement_rate'] for d in depts]
            colors = ['#2563eb' if r >= 75 else '#3b82f6' if r >= 50 else '#93c5fd' for r in rates]
            
            bars = ax.bar(names, rates, color=colors, width=0.55, edgecolor='#1d4ed8', linewidth=1)
            ax.set_title("Department-Wise Placement Rate (%)", fontsize=14, fontweight='bold', pad=15, color='#0f172a')
            ax.set_ylabel("Placement Rate (%)", fontsize=11, fontweight='semibold', color='#334155')
            ax.set_ylim(0, 105)
            ax.tick_params(axis='x', rotation=20, labelsize=9)
            
            # Value labels on top of bars
            for bar, rate in zip(bars, rates):
                yval = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f"{rate:.1f}%", ha='center', va='bottom', fontsize=9, fontweight='bold', color='#1e293b')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return buf

    @classmethod
    def generate_package_distribution_chart(cls, session):
        """Generates a high-resolution Matplotlib histogram/bar chart of Salary Packages."""
        data = AnalyticsService.get_package_analytics(session)
        ranges = data.get('range_distribution', [])
        
        fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
        
        if not ranges:
            ax.text(0.5, 0.5, "No Placement Package Data Available", horizontalalignment='center', verticalalignment='center', fontsize=14, color='#64748b')
            ax.set_axis_off()
        else:
            labels = [r['range'] for r in ranges]
            counts = [r['count'] for r in ranges]
            
            bars = ax.bar(labels, counts, color='#10b981', edgecolor='#059669', width=0.55)
            ax.set_title("Salary Package Distribution (LPA)", fontsize=14, fontweight='bold', pad=15, color='#0f172a')
            ax.set_ylabel("Number of Offers", fontsize=11, fontweight='semibold', color='#334155')
            ax.set_xlabel("Salary Bracket (LPA)", fontsize=11, fontweight='semibold', color='#334155')
            
            for bar, count in zip(bars, counts):
                yval = bar.get_height()
                if yval > 0:
                    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.3, str(count), ha='center', va='bottom', fontsize=9, fontweight='bold', color='#1e293b')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return buf

    @classmethod
    def generate_skill_insights_chart(cls, session):
        """Generates a high-resolution Matplotlib horizontal bar chart of Top Skills."""
        data = AnalyticsService.get_skill_insights(session)
        skills = data.get('most_common_skills', [])[:8]
        
        fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
        
        if not skills:
            ax.text(0.5, 0.5, "No Skill Data Available", horizontalalignment='center', verticalalignment='center', fontsize=14, color='#64748b')
            ax.set_axis_off()
        else:
            names = [s['skill_name'] for s in reversed(skills)]
            counts = [s['student_count'] for s in reversed(skills)]
            
            bars = ax.barh(names, counts, color='#6366f1', edgecolor='#4f46e5', height=0.55)
            ax.set_title("Top In-Demand Student Skills", fontsize=14, fontweight='bold', pad=15, color='#0f172a')
            ax.set_xlabel("Number of Students", fontsize=11, fontweight='semibold', color='#334155')
            
            for bar, count in zip(bars, counts):
                xval = bar.get_width()
                ax.text(xval + 0.5, bar.get_y() + bar.get_height()/2.0, str(count), ha='left', va='center', fontsize=9, fontweight='bold', color='#1e293b')

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return buf
