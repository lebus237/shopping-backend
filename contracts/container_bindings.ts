import type { Application } from '#start/composition'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    application: Application
  }
}
