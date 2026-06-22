module.exports = {
  apps: [
    {
      name: "checkhooks",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 8066,
      },
    },
  ],
};
