/*
 * @link https://www.humhub.org/
 * @copyright Copyright (c) 2017 HumHub GmbH & Co. KG
 * @license https://www.humhub.com/licences
 *
 */
import {schema} from './schema'
import imsize_plugin from './markdownit_imsize'

const image = {
    id: 'image',
    schema: schema,
    registerMarkdownIt: (markdownIt) => {
        markdownIt.use(imsize_plugin);
    }
};

export default image;
