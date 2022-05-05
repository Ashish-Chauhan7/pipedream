import { axios } from "@pipedream/platform";
import crypto from "crypto";

export default {
  type: "app",
  app: "asana",
  propDefinitions: {
    workspaceId: {
      label: "Workspace ID",
      description: "The workspace unique identifier.",
      type: "string",
      optional: false,
      async options() {
        const workspaces = await this.getWorkspaces();
        return workspaces.map((workspace) => {
          return {
            label: workspace.name,
            value: workspace.gid,
          };
        });
      },
    },
    projectId: {
      label: "Project ID",
      description: "The project unique identifier.",
      type: "string",
      optional: false,
      async options(opts) {
        const projects = await this.getProjects(opts.workspaceId);
        return projects.map((project) => {
          return {
            label: project.name,
            value: project.gid,
          };
        });
      },
    },
    taskIds: {
      label: "Tasks",
      description: "The task unique identifiers.",
      type: "string[]",
      async options(opts) {
        const tasks = await this.getTasks({
          project: opts.projectId,
        });

        return tasks.map((task) => {
          return {
            label: task.name,
            value: task.gid,
          };
        });
      },
    },
    organizationId: {
      label: "Organization",
      description: "The organization unique identifier.",
      type: "string",
      optional: false,
      async options() {
        const organizations = await this.getOrganizations();
        return organizations.map((organization) => {
          return {
            label: organization.name,
            value: organization.gid,
          };
        });
      },
    },
    organizations: {
      label: "Organizations",
      description: "List of organizations. This field use the organization GID.",
      type: "string[]",
      async options() {
        const organizations = await this.getOrganizations();

        return this.generateObjectOptions(organizations);
      },
    },
    workspaces: {
      label: "Workspaces",
      description: "List of workspaces. This field use the workspace GID.",
      type: "string[]",
      async options() {
        const workspaces = await this.getWorkspaces();

        return this.generateObjectOptions(workspaces);
      },
    },
    teams: {
      label: "Teams",
      description: "List of teams. This field use the team GID.",
      type: "string[]",
      async options() {
        const teams = await this.getTeams();

        return this.generateObjectOptions(teams);
      },
    },
    projects: {
      label: "Projects",
      description: "List of projects. This field use the project GID.",
      type: "string[]",
      async options() {
        const projects = await this.getProjects();

        return this.generateObjectOptions(projects);
      },
    },
    tags: {
      label: "Tags",
      description: "List of tags. This field use the tag GID.",
      type: "string[]",
      async options() {
        const tags = await this.getTags();

        return this.generateObjectOptions(tags);
      },
    },
    users: {
      label: "Users",
      description: "List of users. This field use the user GID.",
      type: "string[]",
      async options() {
        const users = await this.getUsers();

        return this.generateObjectOptions(users);
      },
    },
    tasks: {
      label: "Tasks",
      description: "List of tasks. This field use the task GID.",
      type: "string[]",
      async options({ project }) {
        const tasks = await this.getTasks({
          project,
        });

        return tasks.map((task) => {
          return {
            label: task.name,
            value: task.gid,
          };
        });
      },
    },
    sections: {
      label: "Sections",
      description: "List of sections. This field use the section GID.",
      type: "string[]",
      async options({ project }) {
        const sections = await this.getSections(project);

        return sections.map((section) => {
          return {
            label: section.name,
            value: section.gid,
          };
        });
      },
    },
  },
  methods: {
    /**
     * Get the access token;
     *
     * @returns {string} The access token.
     */
    _accessToken() {
      return this.$auth.oauth_access_token;
    },
    /**
     * Get the base url of Asana API;
     *
     * @returns {string} The Asana Api base url.
     */
    _apiUrl() {
      return "https://app.asana.com/api/1.0";
    },
    _headers() {
      return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${this._accessToken()}`,
      };
    },
    /**
     * Make a requests with pre defined options.
     *
     * @param {string} path - The path to make the request.
     * @param {object} options - A default Axios options object.
     *
     * @returns {string} The request result data.
     */
    async _makeRequest(path, options = {}, $ = undefined) {
      return await axios($ ?? this, {
        url: `${this._apiUrl()}/${path}`,
        headers: this._headers(),
        ...options,
      });
    },
    async _getAuthorizationHeader({
      data, headers,
    }) {
      return await axios({
        method: "POST",
        url: `${await this._getBaseUrl()}/webhooks`,
        data: data.body,
        headers,
      });
    },
    async createHook(body) {
      const config = {
        method: "post",
        url: `${await this._getBaseUrl()}/webhooks`,
        headers: {
          "Content-Type": "applicaton/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${this.$auth.oauth_access_token}`,
        },
        data: {
          body,
        },
      };
      const authorization = await this._getAuthorizationHeader(config);
      config.headers.authorization = authorization;
      try {
        await axios(config);
      } catch (err) {
        console.log(err);
      }
      return authorization.data;
    },
    async deleteHook(hookId) {
      const config = {
        method: "delete",
        url: `${await this._getBaseUrl()}/webhooks/${hookId}`,
        headers: await this._getHeaders(),
      };
      try {
        await axios(config);
      } catch (err) {
        console.log(err);
      }
    },
    async verifyAsanaWebhookRequest(request) {
      let secret = this.$auth.oauth_refresh_token;
      var base64Digest = function (s) {
        return crypto.createHmac("sha1", secret).update(s)
          .digest("base64");
      };
      var content = JSON.stringify(request.body);
      var doubleHash = base64Digest(content);
      var headerHash = request.headers["x-hook-secret"];
      return doubleHash === headerHash;
    },
    /**
     * Generate a options object to show in a select list UI.
     *
     * @param {string} objects - The list of objects. E.g. { name: "The Name", gid: "123456789"}
     *
     * @returns {string} The list of objects formatted.
     */
    generateObjectOptions(objects) {
      return objects.map((obj) => {
        return {
          label: obj.name,
          value: obj.gid,
        };
      });
    },
    /**
     * Get an Asana Workspace.
     *
     * @param {string} workspaceId - The workspace GID.
     *
     * @returns {string} An Asana Workspace.
     */
    async getWorkspace(workspaceId) {
      return (await this._makeRequest(`workspaces/${workspaceId}`)).data;
    },
    /**
     * Get an Asana Workspace list.
     *
     * @returns {string} An Asana Workspace object list.
     */
    async getWorkspaces() {
      return (await this._makeRequest("workspaces")).data;
    },
    /**
     * Get an Asana Organizations list.
     *
     * @returns {string} An Asana Organizations list.
     */
    async getOrganizations() {
      const organizations = [];
      const workspaces = await this.getWorkspaces();

      for (const workspace of workspaces) {
        let responseWorkspace = await this.getWorkspace(workspace.gid);
        if (responseWorkspace.is_organization) organizations.push(responseWorkspace);
      }

      return organizations;
    },
    /**
     * Get an Asana Project.
     *
     * @param {string} projectId - The project GID.
     *
     * @returns {string} An Asana Project.
     */
    async getProject(projectId) {
      return (await this._makeRequest(`projects/${projectId}`)).data;
    },
    /**
     * Get an Asana Project list.
     *
     * @param {string} workspaceId - The Workspace GID.
     *
     * @returns {string} An Asana Project list.
     */
    async getProjects(workspaceId, params = {}, $) {
      return (await this._makeRequest("projects", {
        params: {
          workspace: workspaceId,
          ...params,
        },
      }, $)).data;
    },
    /**
     * Get an Asana Story.
     *
     * @param {string} storyId - The story GID.
     *
     * @returns {string} An Asana Story.
     */
    async getStory(storyId) {
      return (await this._makeRequest(`stories/${storyId}`)).data;
    },
    /**
     * Get an Asana Task.
     *
     * @param {string} taskId - The Task GID.
     *
     * @returns {string} An Asana Task.
     */
    async getTask(taskId, $) {
      return (await this._makeRequest(`tasks/${taskId}`), {}, $).data;
    },
    /**
     * Get an Asana Task list.
     *
     * @param {string} params - The params to filter tasks.
     *
     * @returns {string} An Asana Task list.
     */
    async getTasks(params, $) {
      const response = await this._makeRequest("tasks", params, $);

      return response.data;
    },
    /**
     * Get an Asana Section list.
     *
     * @param {string} project - A Project GID.
     *
     * @returns {string} An Asana Section list.
     */
    async getSections(project, $) {
      const response = await this._makeRequest(`projects/${project}/sections`, {}, $);

      return response.data ?? [];
    },
    /**
     * Get an Asana Tag.
     *
     * @param {string} tagId - A Tag GID.
     *
     * @returns {string} An Asana Tag.
     */
    async getTag(tagId) {
      return (await this._makeRequest(`tags/${tagId}`)).data;
    },
    /**
     * Get an Asana Tag list.
     *
     * @returns {string} An Asana Tag list.
     */
    async getTags() {
      return (await this._makeRequest("tags")).data;
    },
    /**
     * Get an Asana Team.
     *
     * @param {string} teamId - A Team GID.
     *
     * @returns {string} An Asana Team.
     */
    async getTeam(teamId) {
      return (await this._makeRequest(`teams/${teamId}`)).data;
    },
    /**
     * Get an Asana Team list.
     *
     * @param {string} workspaces - A Workspace GID list.
     *
     * @returns {string} An Asana Team list.
     */
    async getTeams(workspaces) {
      if (!Array.isArray(workspaces)) workspaces = [
        workspaces,
      ];

      let teams = [];

      for (const workspace of workspaces) {
        const response = (await this._makeRequest(`organizations/${workspace}/teams`));

        teams = teams.concat(response.data);
      }

      return teams;
    },
    /**
     * Get an Asana User.
     *
     * @param {string} userId - An User GID.
     *
     * @returns {string} An Asana User.
     */
    async getUser(userId) {
      return (await this._makeRequest(`users/${userId}`)).data;
    },
    /**
     * Get an Asana User list.
     *
     * @param {string} params - The params to filter the users.
     *
     * @returns {string} An Asana User list.
     */
    async getUsers(params = {}) {
      const {
        workspace,
        team,
      } = params;

      return (await this._makeRequest("users", {
        params: {
          workspace,
          team,
        },
      })).data;
    },
  },
};
