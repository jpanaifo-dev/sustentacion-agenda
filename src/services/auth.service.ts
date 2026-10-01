import { isLiveSupabase, supabase } from '../lib/supabase';
import { CurrentUser, Profile, RoleCode } from '../types';
import { initialProfiles, initialRoles, initialUnits } from './mockData';

const DEMO_USER_KEY = 'epg_current_auth_user';

export const authService = {
  async getCurrentUser(): Promise<CurrentUser> {
    if (isLiveSupabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // Fetch roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role:roles(code)')
          .eq('user_id', user.id);

        const roles: RoleCode[] = (userRoles || []).map((ur: any) => ur.role.code);

        // Fetch units
        const { data: userUnits } = await supabase
          .from('user_units')
          .select('unit_id')
          .eq('user_id', user.id);

        const units: string[] = (userUnits || []).map((uu: any) => uu.unit_id);

        // Fetch permissions via role_permissions
        const { data: rolePerms } = await supabase
          .from('user_roles')
          .select(`
            role:roles(
              role_permissions(
                permission:permissions(code)
              )
            )
          `)
          .eq('user_id', user.id);

        const permissions = new Set<string>();
        (rolePerms || []).forEach((rp: any) => {
          (rp.role?.role_permissions || []).forEach((perm: any) => {
            if (perm.permission?.code) {
              permissions.add(perm.permission.code);
            }
          });
        });

        const isSuperAdmin = roles.includes('SUPER_ADMIN');

        return {
          profile: (profile as unknown as Profile) || {
            id: user.id,
            first_name: user.email?.split('@')[0] || 'Usuario',
            last_name: 'UNAP',
            email: user.email || '',
            phone: null,
            document_number: null,
            avatar_url: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          roles,
          permissions: Array.from(permissions),
          units,
          isSuperAdmin,
        };
      }
    }

    // Local / Demo mode User
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore
      }
    }

    // Default to SUPER_ADMIN for immediate full feature evaluation
    const defaultSuperAdmin: CurrentUser = {
      profile: initialProfiles[0],
      roles: ['SUPER_ADMIN'],
      permissions: [
        'users.view', 'users.create', 'users.update', 'users.disable',
        'roles.view', 'roles.manage', 'permissions.view', 'permissions.manage',
        'units.view', 'units.create', 'units.update', 'units.disable',
        'facilities.view', 'facilities.create', 'facilities.update',
        'spaces.view', 'spaces.create', 'spaces.update',
        'defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm',
        'defenses.reschedule', 'defenses.cancel', 'defenses.complete', 'defenses.reopen',
        'defense_participants.manage', 'calendar.view', 'calendar.manage',
        'attachments.view', 'attachments.upload', 'attachments.delete',
        'notifications.send', 'audit.view', 'reports.view', 'reports.export'
      ],
      units: [initialUnits[0].id, initialUnits[1].id],
      isSuperAdmin: true,
    };

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(defaultSuperAdmin));
    return defaultSuperAdmin;
  },

  async setDemoRole(role: RoleCode): Promise<CurrentUser> {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    let permissions: string[] = [];

    if (isSuperAdmin) {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm', 'defenses.reschedule', 'defenses.cancel', 'defenses.complete', 'defenses.reopen', 'defense_participants.manage', 'calendar.view', 'calendar.manage', 'users.view', 'users.create', 'users.update', 'users.disable', 'roles.view', 'roles.manage', 'units.view', 'units.create', 'units.update', 'facilities.view', 'facilities.create', 'spaces.view', 'spaces.create', 'audit.view', 'notifications.send'];
    } else if (role === 'UNIT_COORDINATOR') {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defense_participants.manage', 'calendar.view', 'units.view', 'facilities.view', 'spaces.view'];
    } else if (role === 'VIEWER') {
      permissions = ['defenses.view', 'calendar.view', 'units.view', 'facilities.view', 'spaces.view'];
    } else {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm', 'defenses.reschedule', 'defense_participants.manage', 'calendar.view', 'calendar.manage', 'facilities.view', 'spaces.view', 'units.view', 'notifications.send'];
    }

    const newUser: CurrentUser = {
      profile: {
        ...initialProfiles[0],
        first_name: role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'UNIT_COORDINATOR' ? 'Coordinador' : 'Usuario',
        last_name: role,
        email: `${role.toLowerCase()}@unapiquitos.edu.pe`,
      },
      roles: [role],
      permissions,
      units: [initialUnits[0].id],
      isSuperAdmin,
    };

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  async signOut(): Promise<void> {
    if (isLiveSupabase) {
      await supabase.auth.signOut();
    }
  },
};
