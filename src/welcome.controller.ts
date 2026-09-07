import {Controller, Get} from '@nestjs/common';
import { welcomeService } from './welcome.service';

@Controller('welcome')
export class welcomeController {
  constructor(private readonly welcomeService: welcomeService) {}

 @Get()
    getWelcome():{ message: string } {
        return { message: this.welcomeService.getMessage() };
    }
}

