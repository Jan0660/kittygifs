package other

import (
	"context"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	. "kittygifs/util"
)

func RunTagCount(ctx context.Context) (map[string]int32, error) {
	// gets tags from the tags collection and their counts into a map like {"tag1": 5, "tag2": 3}
	cur, err := TagsCol.Aggregate(ctx, bson.A{
		bson.D{
			{"$group",
				bson.D{
					{"_id", primitive.Null{}},
					{"counts",
						bson.D{
							{"$push",
								bson.D{
									{"k", "$_id"},
									{"v", "$count"},
								},
							},
						},
					},
				},
			},
		},
		bson.D{{"$replaceRoot", bson.D{{"newRoot", bson.D{{"$arrayToObject", "$counts"}}}}}},
	})
	if err != nil {
		return nil, err
	}
	var previousTagCounts map[string]int32
	if cur.Next(ctx) {
		err = cur.Decode(&previousTagCounts)
	} else {
		previousTagCounts = map[string]int32{}
	}
	if err != nil {
		return nil, err
	}
	// gets tags from the __gifs collection__ and their counts into a map like {"tag1": 5, "tag2": 3}
	cur, err = GifsCol.Aggregate(ctx, bson.A{
		bson.D{{"$match", bson.D{{"group", bson.D{{"$exists", false}}}}}},
		bson.D{{"$unwind", "$tags"}},
		bson.D{
			{"$group",
				bson.D{
					{"_id", "$tags"},
					{"sum", bson.D{{"$sum", 1}}},
				},
			},
		},
		//bson.D{{"$sort", bson.D{{"sum", -1}}}},
		bson.D{
			{"$group",
				bson.D{
					{"_id", primitive.Null{}},
					{"counts",
						bson.D{
							{"$push",
								bson.D{
									{"k", "$_id"},
									{"v", "$sum"},
								},
							},
						},
					},
				},
			},
		},
		bson.D{{"$replaceRoot", bson.D{{"newRoot", bson.D{{"$arrayToObject", "$counts"}}}}}},
	})
	if err != nil {
		return nil, err
	}
	cur.Next(ctx)
	var res map[string]int32
	err = cur.Decode(&res)
	if err != nil {
		return nil, err
	}
	TRUE := true
	updateOptions := &options.UpdateOptions{
		Upsert: &TRUE,
	}
	// updates the tags collection with the new counts, handles new too
	for tag, count := range res {
		previousCount, exists := previousTagCounts[tag]
		if !exists || count != previousCount {
			_, err = TagsCol.UpdateOne(ctx, bson.M{"_id": tag}, bson.M{"$set": bson.M{"count": count}}, updateOptions)
			if err != nil {
				return nil, err
			}
		}
	}
	// deletes tags that no longer exist
	for tag, _ := range previousTagCounts {
		_, exists := res[tag]
		if !exists {
			_, err = TagsCol.DeleteOne(ctx, bson.M{"_id": tag})
			if err != nil {
				return nil, err
			}
		}
	}
	return res, nil
}
