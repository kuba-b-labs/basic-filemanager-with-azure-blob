data "azurerm_resource_group" "dev-rg" {
  name = "dev"
}

resource "azurerm_container_group" "filemanager" {
  name                = "filemanager-dev"
  location            = data.azurerm_resource_group.dev-rg.location
  resource_group_name = data.azurerm_resource_group.dev-rg.name
  ip_address_type     = "Public"
  os_type             = "Linux"

  container {
    name   = "filemanager-frontend"
    cpu    = 1
    memory = 1.5
    image  = "ghcr.io/kuba-b-labs/frontend-dev:latest"
    ports {
      port     = 8080
      protocol = "TCP"
    }
    volume {
      name = "ssl"
      secret = {
        "fullchain.pem" = filebase64("${path.root}/../shared/fullchain.pem")
        "private.key"   = filebase64("${path.root}/../shared/test104.key.txt")
      }
      mount_path = "/data"
      read_only  = true
    }
  }
  container {
    name   = "filemanager-backend"
    cpu    = "1"
    memory = "1.5"
    image  = "ghcr.io/kuba-b-labs/backend-dev:latest"
  }
}