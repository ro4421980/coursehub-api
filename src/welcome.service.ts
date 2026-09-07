import { Inyectable } from '@nestjs/common';

@Inyectable()
export class welcomeService {
    getMessage(): string {
        return 'Bienvenido a la API de CourseHub';
    }
}
