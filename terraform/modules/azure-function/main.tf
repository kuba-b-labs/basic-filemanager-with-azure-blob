data "azurerm_resource_group" "dev-rg" {
  name = "dev"
}

resource "azurerm_storage_account" "filemanager-storage" {
  name = "filemanagerstoragejb104"
  location = data.azurerm_resource_group.dev-rg.location
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  account_replication_type = "LRS"
  account_tier = "Standard"
  network_rules {
    default_action = "Deny"

  }
}
resource "azurerm_storage_container" "filemanager-container" {
  storage_account_id = azurerm_storage_account.filemanager-storage.id
  name = "filemanager-container"
  
}

resource "azurerm_service_plan" "service-plan1" {
  name                = "app-service-plan-azure-functions"
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  location            = data.azurerm_resource_group.dev-rg.location
  os_type             = "Linux"
  sku_name            = "FC1"
}

resource "azurerm_function_app_flex_consumption" "urlMaker" {
  name = "urlMaker"
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  location = data.azurerm_resource_group.dev-rg.location
  
  service_plan_id = azurerm_service_plan.service-plan1.id
  storage_authentication_type = "SystemAssignedIdentity"
  storage_container_type = "blobContainer"
  storage_container_endpoint = "$(azurerm_storage_account.filemanager-storage.primary_blob_endpoint)$(azurerm_storage_container.filemanager-container.name)"

  site_config {}
 
  runtime_name = "python"
  runtime_version = "3.13"
  
  identity {type = "SystemAssigned"}
}