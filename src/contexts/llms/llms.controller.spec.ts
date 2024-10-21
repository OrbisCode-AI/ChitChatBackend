import { Test, TestingModule } from "@nestjs/testing";

import { LlmsController } from "./llms.controller";

describe("LlmsController", () => {
  let controller: LlmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmsController],
    }).compile();

    controller = module.get<LlmsController>(LlmsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
