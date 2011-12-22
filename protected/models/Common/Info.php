<?php

/**
 * Description of Info
 *
 * @name Info
 * @author Grzegorz Bliżycki <grzegorzblizycki@gmail.com>
 * @todo 
 * Created: 2011-12-21
 */
class Info extends CMongoEmbeddedDocument
{

    /**
     * @var string 
     */
    public $name;

    /**
     * @var string
     */
    public $description;

    /**
     * @var string If title is null then name become title
     */
    public $title;

    /**
     * @var double Distance form start
     */
    public $distance;

    /**
     * @var double
     */
    public $elevation;

    /**
     * @var string 
     */
    public $difficulty;

    /**
     * @var string
     */
    public $terrain;

    /**
     * @var mixed Array of undefined data type e.g. url's, id's, ...
     */
    public $photos;
    
    /**
     * Optional data added
     * @var array
     */
    public $data;

    /**
     * returns array of behaviors
     * @return array
     */
    public function behaviors()
    {
        return array(
            'MongoTypes' => array(
                'class' => 'CMongoTypeBehavior',
                'attributes' => array(
                    'name' => 'string',
                    'description' => 'string',
                    'title' => 'string',
                    'distance' => 'double',
                    'elevation' => 'double',
                    'difficulty' => 'string',
                    'terrain' => 'string',
                    'photos' => 'array',
                    'data'=>'array',
                ),
            ),
        );
    }

}

