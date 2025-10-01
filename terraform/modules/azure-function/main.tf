data "azurerm_resource_group" "dev-rg" {
  name = "dev"
}

resource "azurerm_storage_account" "this" {
  name                     = "filemanagerstoragejb104"
  location                 = data.azurerm_resource_group.dev-rg.location
  resource_group_name      = data.azurerm_resource_group.dev-rg.name
  account_replication_type = "LRS"
  account_tier             = "Standard"

}
resource "azurerm_storage_container" "this" {
  storage_account_id = azurerm_storage_account.this.id
  name               = "filemanager-container"

}

resource "azurerm_service_plan" "this" {
  name                = "app-service-plan-azure-functions"
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  location            = data.azurerm_resource_group.dev-rg.location
  os_type             = "Linux"
  sku_name            = "Y1"

}

resource "azurerm_virtual_network" "this" {
  name = "filemanager-vnet"
  location = data.azurerm_resource_group.dev-rg.location
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  address_space = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "this" {
  name = "defaultSubnet"
  address_prefixes = ["10.0.1.0/24"]
  virtual_network_name = azurerm_virtual_network.this.name
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  service_endpoints = ["Microsoft.Web"]
}

resource "azurerm_linux_function_app" "this" {
  name                = "urlmaker"
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  location            = data.azurerm_resource_group.dev-rg.location
  site_config {
    application_stack {
      python_version = "3.12"
    }
    ip_restriction {
      action = "Allow"
      virtual_network_subnet_id = azurerm_subnet.sub.id
      priority = 300
    }
    ip_restriction_default_action = "Deny"
  }
  service_plan_id               = azurerm_service_plan.this.id
  storage_account_name          = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key
  identity {
    type = "SystemAssigned"
  }
  functions_extension_version = "~4"
  app_settings = { 
    WEBSITE_RUN_FROM_PACKAGE=1,
    ACCOUNT_URL=azurerm_storage_account.this.primary_blob_endpoint
    }
  
}

resource "azurerm_role_assignment" "this" {
  principal_id = azurerm_linux_function_app.this.identity[0].principal_id
  scope        = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Contributor"
}