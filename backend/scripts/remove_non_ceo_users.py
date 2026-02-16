"""
Remove all users except those with the CEO role.
CEO users are kept; all others are soft-deleted and their related records cleaned.
Run from project root with: python -m scripts.remove_non_ceo_users
Or from backend/: python scripts/remove_non_ceo_users.py
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_db, close_db
from app.models.user import User, Role, UserRole, RefreshToken
from app.models.team import TeamMember


async def main():
    try:
        await init_db()
        print("Connected to database.")

        # Get CEO role
        ceo_role = await Role.find_one(Role.name == "CEO")
        if not ceo_role:
            print("ERROR: CEO role not found in database. Run seed_data.py first.")
            return

        # All user_ids that have CEO role
        ceo_user_roles = await UserRole.find(UserRole.role_id == ceo_role.id).to_list()
        ceo_user_ids = {ur.user_id for ur in ceo_user_roles}
        if not ceo_user_ids:
            print("No users with CEO role found. Nothing to do.")
            return

        print(f"Keeping {len(ceo_user_ids)} CEO user(s).")

        # Get CEO users to know their organizations
        ceo_users = []
        for uid in ceo_user_ids:
            u = await User.find_one(User.id == uid)
            if u:
                ceo_users.append(u)
        org_ids = {u.organization_id for u in ceo_users}

        # All non-CEO users in those organizations (not deleted yet)
        non_ceo_users = []
        for org_id in org_ids:
            users_in_org = await User.find(
                User.organization_id == org_id,
                User.deleted_at == None,
            ).to_list()
            for u in users_in_org:
                if u.id not in ceo_user_ids:
                    non_ceo_users.append(u)

        if not non_ceo_users:
            print("No non-CEO users to remove.")
            return

        print(f"Soft-deleting {len(non_ceo_users)} non-CEO user(s)...")

        for user in non_ceo_users:
            # Soft-delete user (so they no longer appear in lists)
            user.soft_delete()
            await user.save()

            # Remove their role assignments
            await UserRole.find(UserRole.user_id == user.id).delete()

            # Remove their refresh tokens
            await RefreshToken.find(RefreshToken.user_id == user.id).delete()

            # Remove from any teams
            await TeamMember.find(TeamMember.user_id == user.id).delete()

            print(f"  Removed: {user.first_name} {user.last_name} ({user.email})")

        print(f"\nDone. {len(non_ceo_users)} user(s) removed. Only CEO user(s) remain.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await close_db()
        print("Database connection closed.")


if __name__ == "__main__":
    asyncio.run(main())
