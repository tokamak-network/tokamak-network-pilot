import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    example: 'alice@tokamak.network',
    description: 'Must be a @tokamak.network email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'alice@tokamak.network' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '482917', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
