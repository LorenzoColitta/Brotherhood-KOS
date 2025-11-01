#!/bin/bash
# Doppler Local Development Helper Script
# This script helps set up Doppler CLI in GitHub Codespaces or local environments
# and provides interactive commands to run the bot with Doppler secrets

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Brotherhood-KOS Doppler Local Development Helper${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if Doppler CLI is installed
check_doppler() {
  if command -v doppler &> /dev/null; then
    echo -e "${GREEN}✓${NC} Doppler CLI is already installed"
    doppler --version
    return 0
  else
    return 1
  fi
}

# Function to install Doppler CLI
install_doppler() {
  echo -e "${YELLOW}Installing Doppler CLI...${NC}"
  
  # Check OS and install accordingly
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux (including Codespaces)
    curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
      brew install dopplerhq/tap/doppler
    else
      echo -e "${RED}Error: Homebrew not found. Please install Homebrew first.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error: Unsupported OS. Please install Doppler manually from https://docs.doppler.com/docs/install-cli${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓${NC} Doppler CLI installed successfully"
}

# Function to setup Doppler authentication
setup_doppler_auth() {
  echo ""
  echo -e "${YELLOW}Setting up Doppler authentication...${NC}"
  echo "You need to authenticate with Doppler. Choose an option:"
  echo "  1) Login interactively (recommended for local dev)"
  echo "  2) Use a Service Token (for automation)"
  echo ""
  read -p "Choose option (1 or 2): " auth_option
  
  if [ "$auth_option" = "1" ]; then
    doppler login
    echo -e "${GREEN}✓${NC} Logged in to Doppler"
  elif [ "$auth_option" = "2" ]; then
    echo ""
    echo "Enter your Doppler Service Token:"
    read -s DOPPLER_TOKEN
    export DOPPLER_TOKEN
    echo -e "${GREEN}✓${NC} Service token configured"
  else
    echo -e "${RED}Invalid option${NC}"
    exit 1
  fi
}

# Function to setup Doppler project
setup_doppler_project() {
  echo ""
  echo -e "${YELLOW}Setting up Doppler project...${NC}"
  echo "Run the following command to set up your project:"
  echo -e "  ${BLUE}doppler setup${NC}"
  echo ""
  read -p "Press Enter to run 'doppler setup' now, or Ctrl+C to skip... " -r
  doppler setup
}

# Main menu
show_menu() {
  echo ""
  echo -e "${GREEN}What would you like to do?${NC}"
  echo "  1) Start the Discord bot (doppler run -- npm start)"
  echo "  2) Deploy Discord commands (doppler run -- npm run deploy-commands)"
  echo "  3) Set admin password (doppler run -- npm run set-admin-password)"
  echo "  4) Deploy Cloudflare Worker (doppler run -- wrangler deploy)"
  echo "  5) Run custom command with Doppler"
  echo "  6) Exit"
  echo ""
  read -p "Choose option (1-6): " menu_option
  
  case $menu_option in
    1)
      echo -e "${BLUE}Starting Discord bot with Doppler secrets...${NC}"
      doppler run -- npm start
      ;;
    2)
      echo -e "${BLUE}Deploying Discord commands with Doppler secrets...${NC}"
      doppler run -- npm run deploy-commands
      ;;
    3)
      echo -e "${BLUE}Setting admin password with Doppler secrets...${NC}"
      doppler run -- npm run set-admin-password
      ;;
    4)
      echo -e "${BLUE}Deploying Cloudflare Worker with Doppler secrets...${NC}"
      doppler run -- wrangler deploy
      ;;
    5)
      echo ""
      read -p "Enter your command (without 'doppler run --'): " custom_cmd
      echo -e "${BLUE}Running: doppler run -- $custom_cmd${NC}"
      doppler run -- $custom_cmd
      ;;
    6)
      echo -e "${GREEN}Goodbye!${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid option${NC}"
      show_menu
      ;;
  esac
}

# Main script execution
main() {
  # Check if Doppler is installed
  if ! check_doppler; then
    echo -e "${YELLOW}Doppler CLI is not installed.${NC}"
    read -p "Would you like to install it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      install_doppler
    else
      echo -e "${RED}Doppler CLI is required. Exiting.${NC}"
      exit 1
    fi
  fi
  
  # Check if user is authenticated
  if ! doppler whoami &> /dev/null && [ -z "$DOPPLER_TOKEN" ]; then
    setup_doppler_auth
  else
    echo -e "${GREEN}✓${NC} Already authenticated with Doppler"
  fi
  
  # Check if project is set up
  if ! doppler configure get project &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Doppler project not configured"
    setup_doppler_project
  else
    echo -e "${GREEN}✓${NC} Doppler project: $(doppler configure get project)"
    echo -e "${GREEN}✓${NC} Doppler config: $(doppler configure get config)"
  fi
  
  # Show menu
  show_menu
  
  # Loop menu until exit
  while true; do
    show_menu
  done
}

# Run main function
main
