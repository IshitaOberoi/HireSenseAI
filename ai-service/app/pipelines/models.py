from pydantic import BaseModel, Field
from typing import List, Optional

class EducationItem(BaseModel):
    institution: str = Field(description="Name of the university, college or school")
    degree: Optional[str] = Field(None, description="Degree name, e.g., Bachelor of Science, Master of Science")
    major: Optional[str] = Field(None, description="Field of study or major")
    start_date: Optional[str] = Field(None, description="Start date, e.g. Sept 2020 or 2020")
    end_date: Optional[str] = Field(None, description="End date or 'Present'")

class ExperienceItem(BaseModel):
    company: str = Field(description="Name of the company or organization")
    title: str = Field(description="Job title or role")
    start_date: Optional[str] = Field(None, description="Start date of employment")
    end_date: Optional[str] = Field(None, description="End date of employment or 'Present'")
    responsibilities: List[str] = Field(default=[], description="Bullet points detailing achievements, responsibilities and technologies used")

class ProjectItem(BaseModel):
    title: str = Field(description="Name of the project")
    description: str = Field(description="Short description of what the project accomplished")
    technologies: List[str] = Field(default=[], description="List of technologies used in the project")

class ParsedResumeSchema(BaseModel):
    first_name: Optional[str] = Field(default="", description="First name of the candidate")
    last_name: Optional[str] = Field(default="", description="Last name of the candidate")
    summary: Optional[str] = Field(None, description="A concise 2-3 sentence executive summary of the candidate's professional background, core expertise, and strengths")
    email: Optional[str] = Field(None, description="Email address extracted from the contact info")
    phone: Optional[str] = Field(None, description="Phone number extracted from the contact info")
    github_url: Optional[str] = Field(None, description="GitHub portfolio URL")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    skills: List[str] = Field(default=[], description="List of technical, soft and methodology skills mentioned")
    education: List[EducationItem] = Field(default=[], description="Academic history details")
    experience: List[ExperienceItem] = Field(default=[], description="Professional work experience details")
    projects: List[ProjectItem] = Field(default=[], description="Projects built by the candidate")
    certifications: List[str] = Field(default=[], description="List of professional certifications")
