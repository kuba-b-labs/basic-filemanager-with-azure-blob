terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.45.1"

    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}

}