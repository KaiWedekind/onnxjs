// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {Reshape} from '../../../ops/reshape';
import {Tensor} from '../../../tensor';
import {ShapeUtil} from '../../../util';
import {WebGLInferenceHandler} from '../inference-handler';
import {getPackedShape} from '../utils';

export class WebGLReshape extends Reshape {
  run(inferenceHandler: WebGLInferenceHandler, inputs: Tensor[]): Tensor[] {
    const reshapedDims = ShapeUtil.calculateReshapedDims(inputs[0].dims, inputs[1].integerData);
    const inputTD = inferenceHandler.getOrCreate(inputs[0]);
    const isInitializer = inferenceHandler.session.isInitializer(inputs[0]);
    let packedShape = reshapedDims;
    if (inputTD.channels === 4) {
      packedShape = getPackedShape(reshapedDims);
    }
    const newTD = {
      channels: inputTD.channels,
      dataType: inputs[0].type,
      texture: inputTD.texture,
      height: inputTD.height,
      width: inputTD.width,
      // handle reshaping into scalar Tensors
      shape: packedShape.length !== 0 ? packedShape : [1],
      strides: ShapeUtil.computeStrides(packedShape),
      unpackedShape: reshapedDims,
    };
    const newTensor = new Tensor(newTD.unpackedShape, newTD.dataType, (id: Tensor.Id) => {
      return inferenceHandler.readTexture(newTD);
    });
    if (isInitializer) {
      inferenceHandler.session.setTextureData(newTensor, newTD);
    } else {
      inferenceHandler.setTextureData(newTensor, newTD);
    }
    return [newTensor];
  }
}
