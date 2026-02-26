import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { RobotsService } from './robots.service';

@Module({
  providers: [CrawlerService, RobotsService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
