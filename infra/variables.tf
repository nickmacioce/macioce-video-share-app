variable "project_name" {
  type    = string
  default = "video-share"
}

variable "bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name"
}

variable "cors_origins" {
  type        = list(string)
  description = "Allowed origins for CORS"
  default     = ["http://localhost:3000"]
}
