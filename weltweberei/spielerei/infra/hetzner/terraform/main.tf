// Platzhalter: Hetzner Cloud Grundgerüst
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
  }
  required_version = ">= 1.6.0"
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token" {
  type = string
  description = "Hetzner API Token"
  sensitive = true
}
