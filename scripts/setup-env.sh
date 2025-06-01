#!/bin/bash

# Environment Setup Script for Chat Application
# This script helps set up environment files for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Chat Application Environment Setup${NC}"
echo "======================================="

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    print_error ".env.example file not found!"
    exit 1
fi

# Function to copy environment files
setup_env() {
    local env_type=$1
    local target_file=$2
    
    if [ -f "$target_file" ]; then
        print_warning "$target_file already exists. Do you want to overwrite it? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "Skipping $target_file"
            return
        fi
    fi
    
    cp .env.example "$target_file"
    print_success "Created $target_file"
}

# Function to setup service-specific environment files
setup_service_envs() {
    local env_type=$1
    
    print_info "Setting up service-specific environment files for $env_type..."
    
    # Services with their directories
    declare -A services=(
        ["user"]="services/user-service"
        ["chat"]="services/chat-service"
        ["file"]="services/file-service"
        ["notification"]="services/notification-service"
        ["media"]="services/media-service"
        ["gateway"]="gateway"
        ["ui"]="ui"
    )
    
    for service in "${!services[@]}"; do
        local service_dir="${services[$service]}"
        local env_dir="$service_dir/env"
        
        # Create env directory if it doesn't exist
        mkdir -p "$env_dir"
        
        local env_file=""
        case $env_type in
            "docker")
                env_file="$env_dir/.env.docker"
                ;;
            "production")
                env_file="$env_dir/.env.production"
                ;;
            "local")
                env_file="$env_dir/.env.local"
                ;;
        esac
        
        if [ -n "$env_file" ]; then
            setup_env "$service $env_type" "$env_file"
        fi
    done
}

echo
print_info "Choose environment setup:"
echo "1) Development (Local - non-Docker)"
echo "2) Development (Docker)"
echo "3) Production"
echo "4) All environments"
echo "5) Show current environment files"
echo "6) Exit"

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        print_info "Setting up local development environment..."
        setup_env "local development" ".env.local"
        setup_env "local development" ".env.development"
        setup_service_envs "local"
        echo
        print_info "Local development setup complete!"
        print_warning "Remember to:"
        echo "  - Update MongoDB URI to use localhost"
        echo "  - Update RabbitMQ URL to use localhost"
        echo "  - Set service URLs to use localhost ports"
        ;;
    2)
        print_info "Setting up Docker development environment..."
        setup_env "Docker development" ".env.docker"
        setup_service_envs "docker"
        echo
        print_info "Docker development setup complete!"
        print_warning "Remember to:"
        echo "  - Update JWT secrets"
        echo "  - Configure SMTP settings"
        echo "  - Set your IP for MEDIASOUP_ANNOUNCED_IP if needed"
        ;;
    3)
        print_info "Setting up production environment..."
        setup_env "production" ".env.production"
        setup_service_envs "production"
        echo
        print_info "Production setup complete!"
        print_error "CRITICAL: Update all production environment files with:"
        echo "  - Strong JWT secrets (minimum 32 characters)"
        echo "  - Production database credentials"
        echo "  - Production SMTP settings"
        echo "  - Your server's public IP for MEDIASOUP_ANNOUNCED_IP"
        echo "  - Production domain URLs"
        ;;
    4)
        print_info "Setting up all environments..."
        setup_env "local development" ".env.local"
        setup_env "development" ".env.development"
        setup_env "Docker development" ".env.docker"
        setup_env "production" ".env.production"
        setup_service_envs "local"
        setup_service_envs "docker"
        setup_service_envs "production"
        echo
        print_success "All environments setup complete!"
        ;;
    5)
        print_info "Current environment files:"
        echo
        echo "Main environment files:"
        for file in .env.local .env.development .env.docker .env.production; do
            if [ -f "$file" ]; then
                print_success "$file ✓"
            else
                print_warning "$file ✗"
            fi
        done
        
        echo
        echo "Service-specific environment files:"
        declare -A services=(
            ["user"]="services/user-service"
            ["chat"]="services/chat-service"
            ["file"]="services/file-service"
            ["notification"]="services/notification-service"
            ["media"]="services/media-service"
            ["gateway"]="gateway"
            ["ui"]="ui"
        )
        
        for service in "${!services[@]}"; do
            service_dir="${services[$service]}"
            echo
            echo "$service service (${service_dir}/env/):"
            for env_type in local docker production example; do
                env_file="${service_dir}/env/.env.${env_type}"
                if [ -f "$env_file" ]; then
                    print_success "  .env.${env_type} ✓"
                else
                    print_warning "  .env.${env_type} ✗"
                fi
            done
        done
        ;;
    6)
        print_info "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

echo
print_info "Next steps:"
echo "1. Edit the created environment files with your specific values"
echo "2. Review docs/ENVIRONMENT.md for detailed configuration guide"
echo "3. Start your application with: docker-compose up --build"
echo
print_success "Environment setup completed! 🎉"
