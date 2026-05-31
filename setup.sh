#!/bin/sh
# Setup script — registers ux-review MCP in supported local MCP client configs.
# Run once after cloning:  ./setup.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$SCRIPT_DIR/bin/ux-review-mcp"

if [ ! -x "$LAUNCHER" ]; then
  echo "ERROR: Launcher not found at $LAUNCHER"
  echo "Run 'npm run build' first, then re-run this script."
  exit 1
fi

# Ensure nvm node is available
if ! "$LAUNCHER" --help >/dev/null 2>&1; then
  echo "WARNING: Launcher failed. Ensure Node v20 is installed: nvm install 20"
fi

add_mcp_entry() {
  local config_dir="$1"
  local config_file="$config_dir/opencode.json"

  mkdir -p "$config_dir"

  if [ ! -f "$config_file" ]; then
    # Create fresh config
    cat > "$config_file" <<EOF
{
  "mcp": {
    "ux-review": {
      "type": "local",
      "command": ["$LAUNCHER"],
      "enabled": true
    }
  }
}
EOF
    echo "✓ Created $config_file"
    return
  fi

  # Check if ux-review already exists
  if grep -q '"ux-review"' "$config_file" 2>/dev/null; then
    # Update existing entry with correct launcher path
    # Use node for cross-platform JSON manipulation
    node -e "
      const fs = require('fs');
      const f = '$config_file';
      const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!cfg.mcp) cfg.mcp = {};
      cfg.mcp['ux-review'] = { type: 'local', command: ['$LAUNCHER'], enabled: true };
      fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
    " 2>/dev/null && echo "✓ Updated ux-review in $config_file" || echo "⚠ Could not auto-update $config_file — edit manually"
    return
  fi

  # Add new entry to existing config
  node -e "
    const fs = require('fs');
    const f = '$config_file';
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!cfg.mcp) cfg.mcp = {};
    cfg.mcp['ux-review'] = { type: 'local', command: ['$LAUNCHER'], enabled: true };
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
  " 2>/dev/null && echo "✓ Added ux-review to $config_file" || echo "⚠ Could not auto-update $config_file — edit manually"
}

add_vscode_mcp_entry() {
  local config_file="$HOME/Library/Application Support/Code/User/mcp.json"
  
  if [ ! -d "$(dirname "$config_file")" ]; then
    return  # VS Code not installed, skip
  fi

  if [ ! -f "$config_file" ]; then
    # Create fresh config
    mkdir -p "$(dirname "$config_file")"
    cat > "$config_file" <<EOF
{
  "servers": {
    "ux-review": {
      "command": "$LAUNCHER",
      "type": "stdio"
    }
  }
}
EOF
    echo "✓ Created $config_file"
    return
  fi

  # Update or add ux-review entry in existing config
  node -e "
    const fs = require('fs');
    const f = '$config_file';
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!cfg.servers) cfg.servers = {};
    cfg.servers['ux-review'] = { command: '$LAUNCHER', type: 'stdio' };
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n');
  " 2>/dev/null && echo "✓ Updated ux-review in $config_file" || echo "⚠ Could not auto-update VS Code MCP config — edit manually"
}

echo ""
echo "UX Review MCP — Setup"
echo "====================="
echo "Launcher: $LAUNCHER"
echo ""

add_mcp_entry "$HOME/.config/agent"
add_mcp_entry "$HOME/.config/opencode"
add_vscode_mcp_entry

if git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$SCRIPT_DIR" config core.hooksPath .githooks || true
  chmod +x "$SCRIPT_DIR/.githooks/post-merge" "$SCRIPT_DIR/scripts/auto-update.sh" "$SCRIPT_DIR/scripts/enable-auto-update.sh" 2>/dev/null || true
fi

echo ""
echo "Done!"
echo "  • MCP client app: fully restart and open a new chat/session"
echo "  • VS Code: Restart or reload window (Cmd+Shift+P → Developer: Reload Window)"
echo "  • Auto-update: enabled for this clone (post-merge hook)"
echo ""
