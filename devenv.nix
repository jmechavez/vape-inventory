{ pkgs, lib, config, inputs, ... }:

{
  packages = [
    pkgs.git
    pkgs.golangci-lint
    pkgs.ngrok
  ];

  languages.go.enable = true;

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
  };

  services.postgres = {
    enable = true;

    initialDatabases = [
      {
        name = "vape_inventory";
      }
    ];
  };

  # env.DATABASE_URL = "postgres:///$PGHOST/vape_inventory";
  #
  # enterShell = ''
  #   echo "🚀 Vape Inventory development environment"
  #   echo "Go: $(go version)"
  #   echo "Node: $(node --version)"
  #   echo "Git: $(git --version)"
  #   echo "golangci-lint: $(golangci-lint --version | head -n 1)"
  #   echo "PostgreSQL: $(psql --version)"
  #   echo "ngrok: $(ngrok --version 2>/dev/null || echo 'not installed')"
  # '';
}
