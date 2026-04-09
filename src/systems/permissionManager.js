//======================================================================
//                    PERMISSION MANAGER (Role Whitelist)
//======================================================================

const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class PermissionManager {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/permissions');
        this.ensureDataFolder();
    }

    ensureDataFolder() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    getGuildPermissionsPath(guildId) {
        return path.join(this.dataPath, `${guildId}.json`);
    }

    loadGuildPermissions(guildId) {
        const filePath = this.getGuildPermissionsPath(guildId);
        if (!fs.existsSync(filePath)) {
            const defaultPerms = {
                whitelistedRoles: [],
                adminCommands: [
                    'addmoney', 'removemoney', 'setmoney',
                    'giveaway', 'minecraftlock', 'minecraftunlock',
                    'mc-create', 'mc-delete', 'mc-start', 'mc-stop', 'mc-restart'
                ]
            };
            fs.writeFileSync(filePath, JSON.stringify(defaultPerms, null, 2));
            return defaultPerms;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    saveGuildPermissions(guildId, permissions) {
        const filePath = this.getGuildPermissionsPath(guildId);
        fs.writeFileSync(filePath, JSON.stringify(permissions, null, 2));
    }

    addWhitelistedRole(guildId, roleId) {
        const perms = this.loadGuildPermissions(guildId);
        if (!perms.whitelistedRoles.includes(roleId)) {
            perms.whitelistedRoles.push(roleId);
            this.saveGuildPermissions(guildId, perms);
        }
        return perms;
    }

    removeWhitelistedRole(guildId, roleId) {
        const perms = this.loadGuildPermissions(guildId);
        perms.whitelistedRoles = perms.whitelistedRoles.filter(r => r !== roleId);
        this.saveGuildPermissions(guildId, perms);
        return perms;
    }

    getWhitelistedRoles(guildId) {
        const perms = this.loadGuildPermissions(guildId);
        return perms.whitelistedRoles || [];
    }

    // Check if user has permission (Owner, ManageGuild, or Whitelisted Role)
    hasPermission(member, ownerId, guildId, commandName) {
        // Owner always has permission
        if (member.id === ownerId) {
            return true;
        }

        // ManageGuild permission
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return true;
        }

        // Check whitelisted roles
        const whitelistedRoles = this.getWhitelistedRoles(guildId);
        const memberRoleIds = member.roles.cache.map(r => r.id);
        
        return whitelistedRoles.some(roleId => memberRoleIds.includes(roleId));
    }

    // List all whitelisted roles with names
    async listWhitelistedRoles(guild) {
        const roleIds = this.getWhitelistedRoles(guild.id);
        const roles = [];

        for (const roleId of roleIds) {
            try {
                const role = await guild.roles.fetch(roleId);
                if (role) {
                    roles.push({
                        id: role.id,
                        name: role.name,
                        color: role.hexColor,
                        position: role.position
                    });
                }
            } catch (err) {
                // Role doesn't exist anymore, skip
            }
        }

        return roles;
    }
}

module.exports = PermissionManager;
