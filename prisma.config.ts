import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: "postgresql://postgres:admin123@localhost:5432/comic_ecommerce",
  },
})