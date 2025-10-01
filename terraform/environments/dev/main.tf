module "filemanager-dev" {
  source = "../../modules/container_group"
}
module "functionapp" {
  source = "../../modules/azure-function"
}