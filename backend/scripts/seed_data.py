"""
Seed data script for initial setup
Run this to populate initial roles and permissions in MongoDB
"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import init_db, close_db
from app.core.security import get_password_hash
from app.models.organization import Organization
from app.models.user import User, Role, Permission, RolePermission, UserRole
from app.models.project import Project
from app.models.team import Team, TeamMember

# Define roles and permissions
ROLES = [
    {"name": "CEO", "description": "Chief Executive Officer - Full system access"},
    {"name": "Admin", "description": "Administrator - Create employees, change passwords, delete employees only"},
    {"name": "Manager", "description": "Project Manager - Can manage projects and teams"},
    {"name": "Team Lead", "description": "Team Lead - Can manage team tasks and sprints"},
    {"name": "Member", "description": "Team Member - Can manage assigned tasks"},
]

PERMISSIONS = [
    # User permissions
    {"name": "user:create", "resource": "user", "action": "create", "description": "Create users"},
    {"name": "user:read", "resource": "user", "action": "read", "description": "View users"},
    {"name": "user:update", "resource": "user", "action": "update", "description": "Update users"},
    {"name": "user:delete", "resource": "user", "action": "delete", "description": "Delete users"},
    
    # Project permissions
    {"name": "project:create", "resource": "project", "action": "create", "description": "Create projects"},
    {"name": "project:read", "resource": "project", "action": "read", "description": "View projects"},
    {"name": "project:update", "resource": "project", "action": "update", "description": "Update projects"},
    {"name": "project:delete", "resource": "project", "action": "delete", "description": "Delete projects"},
    
    # Task permissions
    {"name": "task:create", "resource": "task", "action": "create", "description": "Create tasks"},
    {"name": "task:read", "resource": "task", "action": "read", "description": "View tasks"},
    {"name": "task:update", "resource": "task", "action": "update", "description": "Update tasks"},
    {"name": "task:delete", "resource": "task", "action": "delete", "description": "Delete tasks"},
    
    # Team permissions
    {"name": "team:create", "resource": "team", "action": "create", "description": "Create teams"},
    {"name": "team:read", "resource": "team", "action": "read", "description": "View teams"},
    {"name": "team:update", "resource": "team", "action": "update", "description": "Update teams"},
    {"name": "team:delete", "resource": "team", "action": "delete", "description": "Delete teams"},
    
    # Time tracking permissions
    {"name": "time:create", "resource": "time", "action": "create", "description": "Log time"},
    {"name": "time:read", "resource": "time", "action": "read", "description": "View time entries"},
    {"name": "time:update", "resource": "time", "action": "update", "description": "Update time entries"},
    {"name": "time:delete", "resource": "time", "action": "delete", "description": "Delete time entries"},
]

# Role-Permission mappings
ROLE_PERMISSIONS = {
    "CEO": [p["name"] for p in PERMISSIONS],  # All permissions
    "Admin": [
        "user:create", "user:read", "user:update", "user:delete",
    ],
    "Manager": [
        "user:read", "user:update",
        "project:create", "project:read", "project:update", "project:delete",
        "task:create", "task:read", "task:update", "task:delete",
        "team:create", "team:read", "team:update", "team:delete",
        "time:read", "time:update",
    ],
    "Team Lead": [
        "user:read",
        "project:read",
        "task:create", "task:read", "task:update", "task:delete",
        "team:read", "team:update",
        "time:create", "time:read", "time:update",
    ],
    "Member": [
        "user:read",
        "project:read",
        "task:read", "task:update",
        "team:read",
        "time:create", "time:read", "time:update",
    ],
}


async def seed_roles_and_permissions():
    """Seed roles and permissions"""
    print("Seeding roles and permissions...")
    
    # Create permissions
    permission_map = {}
    for perm_data in PERMISSIONS:
        perm = await Permission.find_one(Permission.name == perm_data["name"])
        if not perm:
            perm = Permission(**perm_data)
            await perm.insert()
        permission_map[perm_data["name"]] = perm
    
    # Create roles and assign permissions
    role_map = {}
    for role_data in ROLES:
        role = await Role.find_one(Role.name == role_data["name"])
        if not role:
            role = Role(**role_data)
            await role.insert()
        role_map[role_data["name"]] = role
        
        # Assign permissions to role
        perm_names = ROLE_PERMISSIONS.get(role_data["name"], [])
        for perm_name in perm_names:
            perm = permission_map.get(perm_name)
            if perm:
                role_perm = await RolePermission.find_one(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id
                )
                if not role_perm:
                    role_perm = RolePermission(role_id=role.id, permission_id=perm.id)
                    await role_perm.insert()
    
    print("Roles and permissions seeded successfully!")
    return role_map


async def seed_organization_and_users(role_map: dict):
    """Seed organization and demo users"""
    print("Seeding organization and users...")
    
    # Create organization
    org = await Organization.find_one(Organization.slug == "demo-org")
    if not org:
        org = Organization(
            name="Demo Organization",
            slug="demo-org"
        )
        await org.insert()
    
    # Create demo users with hierarchy
    demo_users = [
        # CEO Level (Top Management)
        {
            "email": "ceo@demo.com",
            "password": "ceo123",
            "first_name": "John",
            "last_name": "Smith",
            "role": "CEO"
        },
        {
            "email": "director@demo.com",
            "password": "director123",
            "first_name": "Sarah",
            "last_name": "Johnson",
            "role": "CEO"
        },
        # Admin - employee management only (create, change password, delete)
        {
            "email": "admin@demo.com",
            "password": "admin123",
            "first_name": "Admin",
            "last_name": "User",
            "role": "Admin"
        },
        
        # Manager Level (Project Managers)
        {
            "email": "manager@demo.com",
            "password": "manager123",
            "first_name": "Jane",
            "last_name": "Williams",
            "role": "Manager"
        },
        {
            "email": "pm1@demo.com",
            "password": "pm123",
            "first_name": "Michael",
            "last_name": "Brown",
            "role": "Manager"
        },
        {
            "email": "pm2@demo.com",
            "password": "pm123",
            "first_name": "Emily",
            "last_name": "Davis",
            "role": "Manager"
        },
        {
            "email": "pm3@demo.com",
            "password": "pm123",
            "first_name": "David",
            "last_name": "Miller",
            "role": "Manager"
        },
        
        # Team Lead Level (Team Leaders)
        {
            "email": "teamlead@demo.com",
            "password": "lead123",
            "first_name": "Robert",
            "last_name": "Wilson",
            "role": "Team Lead"
        },
        {
            "email": "lead1@demo.com",
            "password": "lead123",
            "first_name": "Lisa",
            "last_name": "Moore",
            "role": "Team Lead"
        },
        {
            "email": "lead2@demo.com",
            "password": "lead123",
            "first_name": "James",
            "last_name": "Taylor",
            "role": "Team Lead"
        },
        {
            "email": "lead3@demo.com",
            "password": "lead123",
            "first_name": "Patricia",
            "last_name": "Anderson",
            "role": "Team Lead"
        },
        {
            "email": "lead4@demo.com",
            "password": "lead123",
            "first_name": "Christopher",
            "last_name": "Thomas",
            "role": "Team Lead"
        },
        {
            "email": "lead5@demo.com",
            "password": "lead123",
            "first_name": "Jennifer",
            "last_name": "Jackson",
            "role": "Team Lead"
        },
        
        # Member Level (Team Members)
        {
            "email": "member@demo.com",
            "password": "member123",
            "first_name": "Alice",
            "last_name": "White",
            "role": "Member"
        },
        {
            "email": "dev1@demo.com",
            "password": "dev123",
            "first_name": "Mark",
            "last_name": "Harris",
            "role": "Member"
        },
        {
            "email": "dev2@demo.com",
            "password": "dev123",
            "first_name": "Jessica",
            "last_name": "Martin",
            "role": "Member"
        },
        {
            "email": "dev3@demo.com",
            "password": "dev123",
            "first_name": "Daniel",
            "last_name": "Thompson",
            "role": "Member"
        },
        {
            "email": "dev4@demo.com",
            "password": "dev123",
            "first_name": "Amanda",
            "last_name": "Garcia",
            "role": "Member"
        },
        {
            "email": "dev5@demo.com",
            "password": "dev123",
            "first_name": "Matthew",
            "last_name": "Martinez",
            "role": "Member"
        },
        {
            "email": "dev6@demo.com",
            "password": "dev123",
            "first_name": "Ashley",
            "last_name": "Robinson",
            "role": "Member"
        },
        {
            "email": "dev7@demo.com",
            "password": "dev123",
            "first_name": "Andrew",
            "last_name": "Clark",
            "role": "Member"
        },
        {
            "email": "dev8@demo.com",
            "password": "dev123",
            "first_name": "Michelle",
            "last_name": "Rodriguez",
            "role": "Member"
        },
        {
            "email": "dev9@demo.com",
            "password": "dev123",
            "first_name": "Joshua",
            "last_name": "Lewis",
            "role": "Member"
        },
        {
            "email": "dev10@demo.com",
            "password": "dev123",
            "first_name": "Stephanie",
            "last_name": "Lee",
            "role": "Member"
        },
        {
            "email": "dev11@demo.com",
            "password": "dev123",
            "first_name": "Kevin",
            "last_name": "Walker",
            "role": "Member"
        },
        {
            "email": "dev12@demo.com",
            "password": "dev123",
            "first_name": "Nicole",
            "last_name": "Hall",
            "role": "Member"
        },
        {
            "email": "dev13@demo.com",
            "password": "dev123",
            "first_name": "Ryan",
            "last_name": "Allen",
            "role": "Member"
        },
    ]
    
    user_map = {}
    for user_data in demo_users:
        user = await User.find_one(User.email == user_data["email"])
        if not user:
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                organization_id=org.id,
                is_active=True
            )
            await user.insert()
            
            # Assign role
            role = role_map.get(user_data["role"])
            if role:
                user_role = UserRole(
                    user_id=user.id,
                    role_id=role.id,
                    scope_type="organization",
                    scope_id=None
                )
                await user_role.insert()
        
        user_map[user_data["role"]] = user
    
    print("Organization and users seeded successfully!")
    return org, user_map


async def seed_projects_and_teams(org, user_map: dict, role_map: dict):
    """Seed demo projects and teams"""
    print("Seeding projects and teams...")
    
    # Get users by role
    manager = user_map.get("Manager") or user_map.get("manager@demo.com")
    team_lead = user_map.get("Team Lead") or user_map.get("teamlead@demo.com")
    member = user_map.get("Member") or user_map.get("member@demo.com")
    
    if not manager or not team_lead:
        print("Skipping projects/teams - users not found")
        return
    
    # Create team - skip if exists to avoid errors
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from app.core.config import settings
        
        client = AsyncIOMotorClient(settings.DATABASE_URL)
        db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0]
        db = client[db_name]
        
        existing_team = await db.teams.find_one({"name": "Development Team", "deleted_at": None})
        if not existing_team:
            team = Team(
                name="Development Team",
                description="Main development team",
                organization_id=org.id,
                team_lead_id=team_lead.id
            )
            await team.insert()
            
            # Add some members to team
            if member:
                team_member = TeamMember(
                    team_id=team.id,
                    user_id=member.id
                )
                await team_member.insert()
    except Exception as e:
        print(f"Note: Could not create team (may already exist): {e}")
    
    # Create project - skip if exists
    try:
        existing_project = await db.projects.find_one({"name": "Demo Project", "deleted_at": None})
        if not existing_project:
            from decimal import Decimal
            project = Project(
                name="Demo Project",
                description="A demo project for testing",
                status="In Progress",
                organization_id=org.id,
                manager_id=manager.id,
                team_lead_id=team_lead.id,
                progress_percentage=Decimal("0")
            )
            await project.insert()
    except Exception as e:
        print(f"Note: Could not create project (may already exist): {e}")
    
    print("Projects and teams seeded successfully!")


async def main():
    """Main seeding function"""
    try:
        await init_db()
        role_map = await seed_roles_and_permissions()
        org, user_map = await seed_organization_and_users(role_map)
        await seed_projects_and_teams(org, user_map, role_map)
        print("\n✅ Seed data created successfully!")
        print("\n" + "="*60)
        print("LOGIN CREDENTIALS BY HIERARCHY")
        print("="*60)
        
        # Get all users from database grouped by role
        from app.models.user import UserRole
        
        users_by_role = {"CEO": [], "Admin": [], "Manager": [], "Team Lead": [], "Member": []}
        
        for role_name, role_obj in role_map.items():
            user_roles = await UserRole.find(UserRole.role_id == role_obj.id).to_list()
            for user_role in user_roles:
                user = await User.find_one(User.id == user_role.user_id)
                if user:
                    users_by_role[role_name].append({
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "email": user.email,
                        "password": "See below for passwords"
                    })
        
        # Display by hierarchy with passwords
        print("\n📊 CEO Level (Top Management):")
        print("  • John Smith: ceo@demo.com / ceo123")
        print("  • Sarah Johnson: director@demo.com / director123")
        print("\n🔐 Admin (Employee management only - create, change password, delete):")
        print("  • Admin User: admin@demo.com / admin123")
        print("\n👔 Manager Level (Project Managers):")
        print("  • Jane Williams: manager@demo.com / manager123")
        print("  • Michael Brown: pm1@demo.com / pm123")
        print("  • Emily Davis: pm2@demo.com / pm123")
        print("  • David Miller: pm3@demo.com / pm123")
        
        print("\n👨‍💼 Team Lead Level (Team Leaders):")
        print("  • Robert Wilson: teamlead@demo.com / lead123")
        print("  • Lisa Moore: lead1@demo.com / lead123")
        print("  • James Taylor: lead2@demo.com / lead123")
        print("  • Patricia Anderson: lead3@demo.com / lead123")
        print("  • Christopher Thomas: lead4@demo.com / lead123")
        print("  • Jennifer Jackson: lead5@demo.com / lead123")
        
        print("\n👤 Member Level (Team Members):")
        print("  • Alice White: member@demo.com / member123")
        print("  • Mark Harris: dev1@demo.com / dev123")
        print("  • Jessica Martin: dev2@demo.com / dev123")
        print("  • Daniel Thompson: dev3@demo.com / dev123")
        print("  • Amanda Garcia: dev4@demo.com / dev123")
        print("  • Matthew Martinez: dev5@demo.com / dev123")
        print("  • Ashley Robinson: dev6@demo.com / dev123")
        print("  • Andrew Clark: dev7@demo.com / dev123")
        print("  • Michelle Rodriguez: dev8@demo.com / dev123")
        print("  • Joshua Lewis: dev9@demo.com / dev123")
        print("  • Stephanie Lee: dev10@demo.com / dev123")
        print("  • Kevin Walker: dev11@demo.com / dev123")
        print("  • Nicole Hall: dev12@demo.com / dev123")
        print("  • Ryan Allen: dev13@demo.com / dev123")
        
        print("\n" + "="*60)
        print(f"Total Users: 29 (2 CEOs, 1 Admin, 4 Managers, 6 Team Leads, 16 Members)")
        print("="*60)
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
