#!/bin/bash

# Production Deployment Script
# Moves all changes from develop to production in a squash commit

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Production Deployment Script ===${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Ensure we're on develop branch
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo -e "${YELLOW}Switching to develop branch...${NC}"
    git checkout develop
fi

# Check for uncommitted changes on develop
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes on develop branch${NC}"
    echo -e "${YELLOW}Please commit or stash your changes first${NC}"
    git status --short
    exit 1
fi

# Pull latest develop
echo -e "${YELLOW}Pulling latest develop...${NC}"
git pull origin develop

# Prompt for version number
echo -e "${GREEN}Enter the new version number (current: $(grep __version__ hearingclinic/__init__.py | cut -d'"' -f2)):${NC}"
read -r VERSION

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version cannot be empty${NC}"
    exit 1
fi

# Prompt for commit message
echo -e "${GREEN}Enter commit message for production deployment:${NC}"
read -r COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    echo -e "${RED}Error: Commit message cannot be empty${NC}"
    exit 1
fi

# Switch to production branch
echo -e "${YELLOW}Switching to production branch...${NC}"
git checkout production

# Pull latest production
echo -e "${YELLOW}Pulling latest production...${NC}"
git pull origin production

# Squash merge develop into production with theirs strategy
echo -e "${YELLOW}Squashing all changes from develop into production...${NC}"
git merge --squash -X theirs develop

# Update version in __init__.py
echo -e "${YELLOW}Updating version to $VERSION in __init__.py...${NC}"
sed -i "s/__version__ = \".*\"/__version__ = \"$VERSION\"/" hearingclinic/__init__.py

# Remove app_include_css from hooks.py
echo -e "${YELLOW}Removing app_include_css from hooks.py...${NC}"
sed -i '/^app_include_css = /d' hearingclinic/hooks.py

# Stage all changes
git add -A

# Create the commit
echo -e "${YELLOW}Creating production commit...${NC}"
git commit -m "$COMMIT_MESSAGE"

# Push to production
echo -e "${YELLOW}Pushing to production branch...${NC}"
git push origin production

echo -e "${GREEN}Successfully deployed to production!${NC}"
echo -e "${GREEN}Version: $VERSION${NC}"

# Switch back to develop
echo -e "${YELLOW}Switching back to develop branch...${NC}"
git checkout develop

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}You are now back on the develop branch${NC}"
